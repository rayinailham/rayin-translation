import { ref } from 'vue'
import { supabase } from '../supabase'
import { logger } from '../utils/logger'

const DEFAULT_AI_SETTINGS = Object.freeze({
    temperature: 0.7,
    top_p: 1.0,
    top_k: 0,
    max_tokens: 8192,
    reasoning: false,
    model: 'openrouter/pony-alpha',
    system_prompt: '',
})

export function useSettings(novel) {
    const presetsList = ref([])
    const activePresetId = ref(null)
    const showPromptEditor = ref(false)
    const savingPreset = ref(false)
    
    // Initialize with defaults
    const aiSettings = ref({ ...DEFAULT_AI_SETTINGS })

    async function loadPresets() {
        try {
            const { data, error } = await supabase
                .from('translation_settings')
                .select('*')
                .order('is_default', { ascending: false })
                .order('name')
            
            if (error) throw error
            presetsList.value = data || []
            
            // Auto-select logic
            if (presetsList.value.length > 0) {
                // 1. Try to find a preset for this specific novel
                const novelPreset = novel.value ? presetsList.value.find(p => p.novel_id === novel.value.id) : null
                // 2. Or default
                const defaultPreset = presetsList.value.find(p => p.is_default)
                
                const target = novelPreset || defaultPreset || presetsList.value[0]
                if (target) applyPreset(target)
            }
        } catch (err) {
            logger.error('Failed to load presets', err)
        }
    }

    function applyPreset(preset) {
        if (!preset) return
        activePresetId.value = preset.id
        
        // spread to ensure reactivity update
        aiSettings.value = {
            temperature: preset.temperature ?? DEFAULT_AI_SETTINGS.temperature,
            top_p: preset.top_p ?? DEFAULT_AI_SETTINGS.top_p,
            top_k: preset.top_k ?? DEFAULT_AI_SETTINGS.top_k,
            max_tokens: preset.max_tokens ?? DEFAULT_AI_SETTINGS.max_tokens,
            reasoning: preset.reasoning ?? DEFAULT_AI_SETTINGS.reasoning,
            model: preset.model || DEFAULT_AI_SETTINGS.model,
            system_prompt: preset.system_prompt || '',
        }
    }

    function handlePresetChange(event) {
        const id = event.target.value
        if (id === '__new__') {
            activePresetId.value = null
            aiSettings.value = { ...DEFAULT_AI_SETTINGS }
            showPromptEditor.value = true
            return
        }
        const preset = presetsList.value.find(p => p.id === id)
        if (preset) applyPreset(preset)
    }

    async function saveCurrentPreset() {
        if (savingPreset.value) return

        let name = null
        // If creating new, ask for name
        if (!activePresetId.value) {
            name = prompt('Enter a name for this preset:')
            if (!name) return
        }

        savingPreset.value = true
        // 15 seconds timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)

        // Retry loop for 401 errors
        let retries = 1
        
        try {
            while (retries >= 0) {
                try {
                    // 1. Session Check (prevent hang)
                    const sessionPromise = supabase.auth.getSession()
                    const sessionResult = await Promise.race([
                        sessionPromise,
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Session check timeout')), 3000))
                    ])
                    
                    if (!sessionResult.data.session) {
                        const { error: refreshError } = await supabase.auth.refreshSession()
                        if (refreshError) throw new Error('Session expired: ' + refreshError.message)
                    }

                    const payload = {
                        name: activePresetId.value ? undefined : name, // only for new
                        novel_id: (!activePresetId.value && novel.value?.id) ? novel.value.id : undefined,
                        is_default: !activePresetId.value ? false : undefined,

                        system_prompt: aiSettings.value.system_prompt,
                        model: aiSettings.value.model,
                        temperature: aiSettings.value.temperature,
                        top_p: aiSettings.value.top_p,
                        top_k: aiSettings.value.top_k,
                        max_tokens: aiSettings.value.max_tokens,
                        reasoning: aiSettings.value.reasoning,
                        updated_at: new Date().toISOString(),
                    }
                    
                    // Cleanup undefined
                    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key])


                    if (activePresetId.value) {
                        // Update existing
                        const { error } = await supabase
                            .from('translation_settings')
                            .update(payload)
                            .eq('id', activePresetId.value)
                            .abortSignal(controller.signal)

                        if (error) {
                             if (error.code === 'PGRST301' || error.message.includes('JWT')) {
                                 throw new Error('JWT_EXPIRED')
                             }
                             throw error
                        }

                        // Update local memory
                        const idx = presetsList.value.findIndex(p => p.id === activePresetId.value)
                        if (idx !== -1) {
                            presetsList.value[idx] = { ...presetsList.value[idx], ...payload }
                        }
                        alert('Preset updated.')
                        
                    } else {
                        // Create new
                        const { data, error } = await supabase
                            .from('translation_settings')
                            .insert(payload)
                            .select()
                            .single()
                            .abortSignal(controller.signal)

                        if (error) {
                            if (error.code === 'PGRST301' || error.message.includes('JWT')) {
                                 throw new Error('JWT_EXPIRED')
                             }
                            throw error
                        }
                        
                        if (data) {
                            presetsList.value.push(data)
                            activePresetId.value = data.id
                            // Re-sort
                            presetsList.value.sort((a, b) => {
                                 if (a.is_default === b.is_default) return a.name.localeCompare(b.name)
                                 return a.is_default ? -1 : 1
                            })
                        }
                        alert('New preset saved.')
                    }
                    break // Success

                } catch (e) {
                    if (retries > 0 && e.message === 'JWT_EXPIRED') {
                        // Refresh and retry
                        try {
                            await supabase.auth.refreshSession()
                        } catch (refreshErr) {
                            console.warn('Refresh failed during retry', refreshErr)
                        }
                        retries--
                        continue
                    }

                    console.error(e)
                    if (e.name === 'AbortError') {
                        alert('Request timed out. Please check connection.')
                    } else if (e.message !== 'JWT_EXPIRED') {
                        // Don't alert if we are retrying
                        alert('Failed to save preset: ' + e.message)
                    }
                    
                    if (retries <= 0 && e.message === 'JWT_EXPIRED') {
                         alert('Session expired. Please reload.')
                    }
                    
                    // If not retryable, break loop
                    if (e.message !== 'JWT_EXPIRED' && (!retries || e.name === 'AbortError')) {
                        break
                    }
                    // For JWT expired but retries exhausted, we break naturally by loop condition, but let's be explicit
                    if (retries <= 0) break
                }
            } 
        } finally {
            clearTimeout(timeoutId)
            savingPreset.value = false
        }
    }

    async function deletePreset() {
        if (!activePresetId.value) return
        
        const preset = presetsList.value.find(p => p.id === activePresetId.value)
        if (preset?.is_default) { 
            alert('Cannot delete the default preset.')
            return 
        }
        
        if (!confirm(`Delete preset "${preset?.name}"?`)) return
        
        try {
            const { error } = await supabase
                .from('translation_settings')
                .delete()
                .eq('id', activePresetId.value)
                
            if (error) throw error
            
            // Remove from list
            presetsList.value = presetsList.value.filter(p => p.id !== activePresetId.value)
            activePresetId.value = null
            
            // Re-apply default or reset
            resetToDefault()
            
        } catch (e) {
            alert('Failed to delete: ' + e.message)
        }
    }

    function resetToDefault() {
        const defaultPreset = presetsList.value.find(p => p.is_default)
        if (defaultPreset) {
            applyPreset(defaultPreset)
        } else {
            aiSettings.value = { ...DEFAULT_AI_SETTINGS }
            activePresetId.value = null
        }
    }

    return {
        presetsList,
        activePresetId,
        aiSettings,
        showPromptEditor,
        savingPreset,
        loadPresets,
        applyPreset,
        handlePresetChange,
        saveCurrentPreset,
        deletePreset,
        resetToDefault
    }
}
