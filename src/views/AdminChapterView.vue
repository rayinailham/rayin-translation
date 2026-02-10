<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabase'
import { useAuthStore } from '../stores/auth'
import { marked } from 'marked'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const isEdit = computed(() => !!route.params.chapterId)
const novelSlug = route.params.slug
const novel = ref(null)
const novelsList = ref([])
const chaptersList = ref([])

const form = ref({
  title: '',
  chapter_number: 1,
  content: ''
})

const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const previewMode = ref(false)

// Translation State
const showTranslation = ref(true)
const japaneseText = ref('')
const translationNote = ref('')
const showContext = ref(false)
const isTranslating = ref(false)
const translationError = ref('')

// Word count
const wordCount = computed(() => {
    const text = form.value.content?.trim()
    if (!text) return 0
    return text.split(/\s+/).filter(Boolean).length
})

const charCount = computed(() => form.value.content?.length || 0)

const renderedContent = computed(() => {
    return form.value.content ? marked(form.value.content) : ''
})

// Keyboard shortcuts
function handleKeydown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        save()
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        previewMode.value = !previewMode.value
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
        e.preventDefault()
        showTranslation.value = !showTranslation.value
    }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)

  if (!auth.isSuperAdmin) {
     if (auth.user) router.push('/')
  }

  const { data: allNovels } = await supabase.from('novels').select('id, title, slug, synopsis').order('title')
  novelsList.value = allNovels || []

  if (isEdit.value) {
      await loadChapter(route.params.chapterId)
  } else if (novelSlug) {
      // Loading via slug (New Chapter mode or just initial load)
      await loadNovelBySlug(novelSlug)
  }
})

async function loadNovelBySlug(slug) {
    const { data } = await supabase.from('novels').select('id, title, slug, synopsis').eq('slug', slug).single()
    if (data) {
        novel.value = data
        await fetchChapters(data.id)
        
        // If simply adding new, predict next chapter number
        if (!isEdit.value) {
            const { data: lastCh } = await supabase.from('chapters')
            .select('chapter_number')
            .eq('novel_id', data.id)
            .order('chapter_number', { ascending: false })
            .limit(1)
            .single()
            if (lastCh) form.value.chapter_number = lastCh.chapter_number + 1
        }
    }
}

async function loadChapter(chapterId) {
    const { data } = await supabase.from('chapters').select('*').eq('id', chapterId).single()
    if (data) {
        form.value = data
        // Load novel info if not present
        if (!novel.value || novel.value.id !== data.novel_id) {
            const { data: n } = await supabase.from('novels').select('id, title, slug, synopsis').eq('id', data.novel_id).single()
            novel.value = n
            await fetchChapters(n.id)
        }
    }
}

async function fetchChapters(novelId) {
    const { data } = await supabase.from('chapters')
        .select('id, chapter_number, title')
        .eq('novel_id', novelId)
        .order('chapter_number', { ascending: false })
    chaptersList.value = data || []
}

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// Auto-dismiss error
watch(errorMsg, (val) => {
    if (val) setTimeout(() => { errorMsg.value = '' }, 5000)
})

function insertSynopsis() {
    if (novel.value?.synopsis) {
        translationNote.value = (translationNote.value ? translationNote.value + '\n\n' : '') + `Synopsis:\n${novel.value.synopsis}`
        showContext.value = true
    }
}

function clearEditor() {
    if (form.value.content && confirm('Clear all content?')) {
        form.value.content = ''
    }
}

function insertText(prefix, suffix = '') {
    const el = textareaRef.value
    if (!el) return
    
    const start = el.selectionStart
    const end = el.selectionEnd
    const text = form.value.content
    const before = text.substring(0, start)
    const selection = text.substring(start, end)
    const after = text.substring(end)
    
    form.value.content = before + prefix + selection + suffix + after
    
    // Restore cursor / selection
    nextTick(() => {
        el.focus()
        el.setSelectionRange(start + prefix.length, end + prefix.length)
        autoResize()
    })
}

async function translate() {
    if (!japaneseText.value.trim()) return
    
    isTranslating.value = true
    translationError.value = ''
    
    if (form.value.content) {
        if (!confirm('Content exists. Translation will be APPENDED. Continue?')) {
            isTranslating.value = false
            return
        }
        form.value.content += '\n\n'
    }
    
    try {
        const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
        if (!apiKey) throw new Error('OpenRouter API Key not found in .env.local')

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": window.location.origin, 
                "X-Title": "Novel Translator", 
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "openrouter/pony-alpha",
                stream: true,
                messages: [
                    {
                        role: "system",
                        content: `You are a professional translator of Japanese Light Novels. Translate the provided Japanese text into natural, clear, and faithful English.

CONTEXT / NOTES:
${translationNote.value}

ABSOLUTE RULES (No Exceptions):

1. Full Fidelity:
   Translate ALL content exactly. Do not omit thoughts, hesitation markers, trailing phrases, or emotional cues. Do not summarize. Do not simplify meaning.

2. Structural Preservation (Critical):
   Preserve the original logical and contrast structure of every sentence.
   - If the Japanese uses contrast markers (けど, けれど, けれども, のに, が), you MUST preserve the contrast in English using "but...", "however...", or an equivalent structure.
   - If a sentence trails off (e.g., ends with けど…), you MUST keep the trailing structure in English (e.g., "...but...").
   - Do NOT resolve unfinished tension.

3. No Meaning Resolution:
   Do NOT convert contrast into confirmation.
   Do NOT replace "I thought X, but..." with "I thought X. And it was true."
   Do NOT smooth emotional ambiguity.

4. Dialogue Intensity Preservation:
   Preserve emotional force.
   - Shock or alarm must be reflected explicitly (e.g., "?!").
   - Do NOT flatten strong reactions into neutral questions.

5. Natural but Exact English:
   Use grammatically complete English, but never at the cost of altering structure or meaning.
   Clarity is required. Rewriting logic is forbidden.

6. Literal Core Terms:
   Preserve key nouns literally.
   - "Bakappuru" → "Idiot Couple"
   - "Icha-icha" → "getting lovey-dovey" or "flirting"
   Do not reinterpret or embellish core nouns.

7. Honorifics & Status:
   Maintain hierarchy accurately.
   - "Ojou-sama" → "Young Lady"

8. Cultural References:
   If a pun or obscure reference cannot be conveyed naturally, add:
   (TL Note: explanation)

9. OUTPUT:
   Just output the translation directly. Do not add "TITLE:" or "CONTENT:" headers. Do not add any conversational filler. Start translating immediately.`
                    },
                    {
                        role: "user",
                        content: japaneseText.value
                    }
                ]
            })
        });

        if (!response.ok) {
            const errBody = await response.text()
            throw new Error(`API Error: ${response.status} - ${errBody}`)
        }

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
                        const content = json.choices?.[0]?.delta?.content || '';
                        if (content) form.value.content += content
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
    }
}

async function save() {
    saving.value = true
    errorMsg.value = ''
    
    try {
        if (!novel.value || !novel.value.id) {
            throw new Error('Please select a novel first.')
        }

        const payload = {
            ...form.value,
            novel_id: novel.value.id,
            updated_at: new Date()
        }

        let error = null
        if (isEdit.value) {
             const { error: err } = await supabase.from('chapters').update(payload).eq('id', route.params.chapterId)
             error = err
        } else {
             const { error: err } = await supabase.from('chapters').insert(payload)
             error = err
        }

        if (error) throw error
        
        const slug = novel.value.slug
        if (slug) {
             router.push({ name: 'novel', params: { slug: slug } })
        } else {
             router.push('/')
        }

    } catch (err) {
        errorMsg.value = err.message
    } finally {
        saving.value = false
    }
}

async function deleteChapter() {
    if (!confirm('Delete this chapter permanently?')) return
    const { error } = await supabase.from('chapters').delete().eq('id', route.params.chapterId)
    if (error) alert(error.message)
    else router.push({ name: 'novel', params: { slug: novel.value.slug } })
}

async function handleNovelChange(event) {
    const selectedId = event.target.value
    const selected = novelsList.value.find(n => n.id === selectedId)
    if (selected) {
        novel.value = selected
        await fetchChapters(selected.id)
        
        // Find latest chapter to edit, or go to add new if none
        if (chaptersList.value.length > 0) {
            const latest = chaptersList.value[0] // Sorted desc
            router.push({ name: 'edit-chapter', params: { chapterId: latest.id } })
        } else {
            router.push({ name: 'add-chapter', params: { slug: selected.slug } })
        }
    }
}

function handleChapterChange(event) {
    const val = event.target.value
    if (val === '__new__') {
        router.push({ name: 'add-chapter', params: { slug: novel.value.slug } })
    } else {
        router.push({ name: 'edit-chapter', params: { chapterId: val } })
    }
} 
 
// Watch for route changes to reload data without page refresh
watch(
    () => route.params.chapterId,
    async (newId) => {
        if (newId) {
             await loadChapter(newId)
        }
    }
)

watch(
    () => route.params.slug,
    async (newSlug) => {
        if (newSlug && !route.params.chapterId) {
            // Reset form for new chapter
             form.value = {
                title: '',
                chapter_number: 1,
                content: ''
             }
             await loadNovelBySlug(newSlug)
        }
    }
)

// Auto-resize textarea
const textareaRef = ref(null)

function autoResize() {
    const el = textareaRef.value
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
}

watch(() => form.value.content, async () => {
    await nextTick()
    autoResize()
})

onMounted(async () => {
    await nextTick()
    autoResize()
})
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
    <!-- Compact Toolbar -->
    <header class="h-11 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 sticky top-0 z-50 flex items-center justify-between px-3 shrink-0">
        <div class="flex items-center gap-2 min-w-0">
             <button @click="router.back()" class="p-1.5 -ml-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded transition shrink-0" title="Back">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
             </button>
             
             <div class="h-4 w-px bg-neutral-200 dark:bg-neutral-800 shrink-0"></div>

             <div v-if="novelsList.length > 0" class="relative group">
                <select 
                    :value="novel?.id" 
                    @change="handleNovelChange"
                    class="appearance-none pl-2 pr-6 py-1 text-xs font-semibold bg-neutral-100 dark:bg-neutral-900 rounded-md outline-none text-neutral-700 dark:text-neutral-300 cursor-pointer hover:text-neutral-900 dark:hover:text-white max-w-[150px] truncate border border-transparent hover:border-neutral-300 dark:hover:border-neutral-700 transition"
                >
                    <option value="" disabled :selected="!novel">Select Novel</option>
                    <option v-for="n in novelsList" :key="n.id" :value="n.id">{{ n.title }}</option>
                </select>
                <div class="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
             </div>
             <span v-else class="text-xs font-semibold truncate max-w-[180px]">{{ novel?.title || '...' }}</span>
             
             <span class="text-[10px] text-neutral-400 shrink-0">/</span>

             <!-- Chapter Selector -->
             <div class="relative group">
                 <select 
                    :value="isEdit ? form.id : '__new__'"
                    @change="handleChapterChange"
                    class="appearance-none pl-2 pr-6 py-1 text-xs font-mono bg-neutral-100 dark:bg-neutral-900 rounded-md outline-none text-neutral-700 dark:text-neutral-300 cursor-pointer hover:text-neutral-900 dark:hover:text-white max-w-[100px] truncate border border-transparent hover:border-neutral-300 dark:hover:border-neutral-700 transition"
                 >
                     <option value="__new__">NEW</option>
                     <option v-for="ch in chaptersList" :key="ch.id" :value="ch.id">Ch. {{ ch.chapter_number }}</option>
                 </select>
                  <div class="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
             </div>
             
             <div class="flex items-center gap-1 shrink-0 ml-1">
                 <span class="text-[10px] text-neutral-400 uppercase">#</span>
                 <input 
                    v-model="form.chapter_number" 
                    type="number" 
                    step="1" 
                    class="w-8 bg-transparent text-xs font-mono text-neutral-700 dark:text-neutral-300 outline-none text-center border-b border-transparent hover:border-neutral-300 dark:hover:border-neutral-700 focus:border-blue-500"
                 />
             </div>

             <span v-if="isEdit" class="text-[9px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded font-medium shrink-0">EDIT</span>
             <span v-else class="text-[9px] px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded font-medium shrink-0">NEW</span>
        </div>

        <div class="flex items-center gap-1.5">
            <!-- Word count -->
            <span class="text-[10px] text-neutral-400 tabular-nums hidden sm:block" :title="`${charCount} characters`">
                {{ wordCount.toLocaleString() }} words
            </span>
            
            <div class="h-4 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block"></div>

            <button @click="previewMode = !previewMode" :class="{'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white': previewMode}" class="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded transition" :title="'Preview (Ctrl+P)'">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            
            <button @click="showTranslation = !showTranslation" :class="{'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400': showTranslation}" class="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded transition" :title="'Translator (Ctrl+J)'">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
            </button>

            <button v-if="form.content" @click="clearEditor" class="p-1.5 text-neutral-400 hover:text-red-500 rounded transition" title="Clear content">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>

            <button v-if="isEdit" @click="deleteChapter" class="p-1.5 text-neutral-400 hover:text-red-500 rounded transition" title="Delete chapter">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
            </button>

            <div class="h-4 w-px bg-neutral-200 dark:bg-neutral-800"></div>

            <button @click="save" :disabled="saving" class="flex items-center gap-1.5 px-3 py-1 bg-neutral-900 dark:bg-white text-white dark:text-black text-[11px] font-bold rounded-md hover:opacity-80 transition disabled:opacity-50">
                <svg v-if="saving" class="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                {{ saving ? 'Saving' : 'Save' }}
                <kbd v-if="!saving" class="text-[9px] opacity-50 font-normal hidden sm:inline">^S</kbd>
            </button>
        </div>
    </header>

    <div class="flex-1 flex items-start min-h-0 relative">
        <!-- Translator Panel (Collapsible, Compact) -->
        <aside v-if="showTranslation" class="w-72 lg:w-80 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex flex-col z-10 shrink-0 sticky top-11 h-[calc(100vh-2.75rem)]">
             <!-- Source Text - flex-1 to fill available space -->
             <div class="flex flex-col flex-1 min-h-0">
                 <div class="px-3 pt-3 pb-1 flex items-center justify-between">
                     <h3 class="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Source (JP)</h3>
                     <span v-if="japaneseText" class="text-[9px] text-neutral-400 tabular-nums">{{ japaneseText.length }} chars</span>
                 </div>
                 <div class="px-3 flex-1 min-h-0 pb-2">
                     <textarea 
                        v-model="japaneseText" 
                        placeholder="Paste Japanese text..." 
                        class="w-full h-full px-2.5 py-2 bg-white dark:bg-neutral-950 rounded border border-neutral-200 dark:border-neutral-800 focus:border-blue-500 outline-none text-xs leading-relaxed resize-none"
                     ></textarea>
                 </div>
             </div>

             <!-- Context (Collapsible) -->
             <div class="border-t border-neutral-200 dark:border-neutral-800">
                 <button @click="showContext = !showContext" class="w-full px-3 py-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition">
                     <span class="flex items-center gap-1.5">
                         Context
                         <span v-if="translationNote" class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                     </span>
                     <div class="flex items-center gap-2">
                         <span v-if="novel?.synopsis" @click.stop="insertSynopsis" class="text-[9px] text-blue-500 hover:text-blue-600 font-medium normal-case tracking-normal">+Synopsis</span>
                         <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="{'rotate-180': showContext}" class="transition-transform"><path d="m6 9 6 6 6-6"/></svg>
                     </div>
                 </button>
                 <div v-show="showContext" class="px-3 pb-3">
                     <textarea 
                        v-model="translationNote" 
                        placeholder="Names, glossary, instructions..." 
                        class="w-full h-24 px-2.5 py-2 bg-white dark:bg-neutral-950 rounded border border-neutral-200 dark:border-neutral-800 focus:border-blue-500 outline-none text-[11px] leading-relaxed resize-none"
                     ></textarea>
                 </div>
             </div>

             <!-- Translate Action -->
             <div class="px-3 pb-3 space-y-2 shrink-0">
                 <p v-if="translationError" class="px-2.5 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[11px] rounded border border-red-100 dark:border-red-900/30 line-clamp-2">
                     {{ translationError }}
                 </p>
                 <button 
                    type="button" 
                    @click="translate" 
                    :disabled="isTranslating || !japaneseText"
                    class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-md transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                 >
                    <svg v-if="isTranslating" class="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    {{ isTranslating ? 'Translating...' : 'Translate' }}
                 </button>
             </div>
        </aside>

        <!-- Main Editor Area -->
        <main class="flex-1 min-w-0 pb-32">
            <div class="max-w-3xl mx-auto px-5 py-5 min-h-full">
                
                <div v-if="!previewMode" class="flex flex-col h-full">
                    <!-- Compact Title Row -->
                    <input 
                        v-model="form.title" 
                        placeholder="Chapter Title"
                        class="w-full text-2xl font-bold text-neutral-900 dark:text-white bg-transparent outline-none placeholder:text-neutral-300 dark:placeholder:text-neutral-700 mb-4"
                    />

                    <!-- Formatting Toolbar -->
                    <div class="flex items-center gap-1 mb-2 overflow-x-auto pb-1">
                        <button @click="insertText('**', '**')" class="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition" title="Bold">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8"/></svg>
                        </button>
                        <button @click="insertText('*', '*')" class="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition" title="Italic">
                             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/></svg>
                        </button>
                        <button @click="insertText('~~', '~~')" class="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition" title="Strikethrough">
                             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" x2="20" y1="12" y2="12"/></svg>
                        </button>
                        <div class="w-px h-4 bg-neutral-200 dark:bg-neutral-800 mx-1"></div>
                        <button @click="insertText('# ')" class="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition" title="Heading 1">
                             <span class="text-[10px] font-bold">H1</span>
                        </button>
                        <button @click="insertText('## ')" class="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition" title="Heading 2">
                             <span class="text-[10px] font-bold">H2</span>
                        </button>
                         <div class="w-px h-4 bg-neutral-200 dark:bg-neutral-800 mx-1"></div>
                        <button @click="insertText('> ')" class="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition" title="Quote">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M6 9h12"/></svg>
                        </button>
                        <button @click="insertText('***\n')" class="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition" title="Horizontal Rule">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" x2="19" y1="12" y2="12"/></svg>
                        </button>
                    </div>

                    <!-- Editor -->
                    <textarea 
                        ref="textareaRef"
                        v-model="form.content" 
                        @input="autoResize"
                        class="w-full flex-1 min-h-[500px] resize-none outline-none text-[15px] leading-[1.8] text-neutral-800 dark:text-neutral-200 bg-transparent placeholder:text-neutral-300 dark:placeholder:text-neutral-700 overflow-hidden"
                        placeholder="Start writing or translate..."
                    ></textarea>
                </div>

                <!-- Preview Mode -->
                <div v-else class="prose dark:prose-invert prose-base max-w-none mx-auto">
                    <div class="flex items-center gap-3 mb-6 not-prose">
                        <span class="text-xs font-mono text-neutral-500">Ch. {{ form.chapter_number }}</span>
                        <h1 class="text-2xl font-bold m-0">{{ form.title }}</h1>
                    </div>
                    <div v-html="renderedContent"></div>
                </div>
            </div>
        </main>
    </div>

    <!-- Error Toast (auto-dismiss) -->
    <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="translate-y-2 opacity-0" enter-to-class="translate-y-0 opacity-100" leave-active-class="transition duration-150 ease-in" leave-from-class="translate-y-0 opacity-100" leave-to-class="translate-y-2 opacity-0">
        <div v-if="errorMsg" class="fixed bottom-4 right-4 bg-red-600 text-white px-3.5 py-2 rounded-lg shadow-lg text-xs font-medium flex items-center gap-2 z-50">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
            {{ errorMsg }}
            <button @click="errorMsg = ''" class="ml-1 opacity-70 hover:opacity-100">&times;</button>
        </div>
    </Transition>
  </div>
</template>
