import { ref } from 'vue'

export function useTranslator(form, aiSettings, japaneseText, translationNote) {
    const isTranslating = ref(false)
    const translationError = ref('')
    const translationPhase = ref('') // 'connecting' | 'thinking' | 'streaming' | ''
    const translationElapsed = ref(0)
    const translationTokens = ref(0)
    const reasoningContent = ref('')
    let translationTimer = null

    function startElapsedTimer() {
        translationElapsed.value = 0
        translationTimer = setInterval(() => {
            translationElapsed.value++
        }, 1000)
    }

    function stopElapsedTimer() {
        if (translationTimer) {
            clearInterval(translationTimer)
            translationTimer = null
        }
    }

    function formatElapsed(s) {
        const m = Math.floor(s / 60)
        const sec = s % 60
        return m > 0 ? `${m}m ${sec}s` : `${sec}s`
    }

    async function translate() {
        if (!japaneseText.value.trim()) return
        
        isTranslating.value = true
        translationError.value = ''
        translationPhase.value = 'connecting'
        translationTokens.value = 0
        reasoningContent.value = ''
        startElapsedTimer()
        
        if (form.value.content) {
            if (!confirm('Content exists. Translation will be APPENDED. Continue?')) {
                isTranslating.value = false
                translationPhase.value = ''
                stopElapsedTimer()
                return
            }
            form.value.content += '\n\n'
        }
        
        try {
            const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
            if (!apiKey) throw new Error('OpenRouter API Key not found in .env.local')

            // Build system prompt: base from preset + context notes injected
            let systemPrompt = aiSettings.value.system_prompt || 'Translate the following Japanese text to English faithfully.'
            if (translationNote.value) {
                systemPrompt += `\n\nCONTEXT / NOTES:\n${translationNote.value}`
            }

            const requestBody = {
                model: aiSettings.value.model || 'openrouter/pony-alpha',
                stream: true,
                temperature: aiSettings.value.temperature,
                top_p: aiSettings.value.top_p,
                max_tokens: aiSettings.value.max_tokens,
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: japaneseText.value
                    }
                ]
            }

            // Add optional params only when non-default
            if (aiSettings.value.top_k > 0) requestBody.top_k = aiSettings.value.top_k
            if (aiSettings.value.reasoning) {
                requestBody.reasoning = { effort: 'high' }
            }

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "HTTP-Referer": window.location.origin, 
                    "X-Title": "Novel Translator", 
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errBody = await response.text()
                throw new Error(`API Error: ${response.status} - ${errBody}`)
            }

            translationPhase.value = 'thinking'

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.slice(6);
                        if (jsonStr.trim() === '[DONE]') continue;
                        try {
                            const json = JSON.parse(jsonStr);
                            const delta = json.choices?.[0]?.delta
                            
                            // Handle reasoning/thinking tokens
                            const reasoning = delta?.reasoning_details || delta?.reasoning_content || delta?.reasoning
                            if (reasoning) {
                                if (typeof reasoning === 'string') {
                                    reasoningContent.value += reasoning
                                } else if (Array.isArray(reasoning)) {
                                    for (const r of reasoning) {
                                        if (r?.content) reasoningContent.value += r.content
                                    }
                                }
                            }
                            
                            // Handle actual content tokens
                            const content = delta?.content || '';
                            if (content) {
                                if (translationPhase.value !== 'streaming') {
                                    translationPhase.value = 'streaming'
                                }
                                translationTokens.value++
                                form.value.content += content
                            }
                        } catch (e) {
                             console.warn('Error parsing stream chunk', e);
                        }
                    }
                }
            }

        } catch (e) {
            translationError.value = e.message
        } finally {
            isTranslating.value = false
            translationPhase.value = ''
            stopElapsedTimer()
        }
    }

    return {
        isTranslating,
        translationError,
        translationPhase,
        translationElapsed,
        translationTokens,
        reasoningContent,
        translate,
        formatElapsed
    }
}
