<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

import { marked } from 'marked'
import { supabase } from '../supabase'
import { logger } from '../utils/logger'

// Composables
import { useAdminChapter } from '../composables/useAdminChapter'
import { useSettings } from '../composables/useSettings'
import { useTranslator } from '../composables/useTranslator'
import { useEditor } from '../composables/useEditor'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// 1. Admin Chapter Logic (Form, Data)
const {
    isEdit,
    novelSlug,
    novel,
    novelsList,
    chaptersList,
    form,
    saving,
    errorMsg,
    successMsg,
    loadNovels,
    loadNovelBySlug,
    loadChapter,
    save,
    deleteChapter,
    handleNovelChange: _handleNovelChange,
    handleChapterChange
} = useAdminChapter()

// 2. Settings & Presets
const {
    presetsList,
    activePresetId,
    aiSettings,
    showPromptEditor,
    savingPreset,
    loadPresets,
    applyPreset, // exposed if needed
    handlePresetChange,
    saveCurrentPreset,
    deletePreset,
    resetToDefault
} = useSettings(novel)

// 3. Translation UI State
const showTranslation = ref(true)
const japaneseText = ref('')
const translationNote = ref('')
const showContext = ref(false)
const showSettings = ref(false)

// 4. Translator Logic
const {
    isTranslating,
    translationError,
    translationPhase,
    translationElapsed,
    translationTokens,
    reasoningContent,
    translate,
    cancelTranslation,
    formatElapsed
} = useTranslator(form, aiSettings, japaneseText, translationNote)

// 5. Editor Logic
const {
    textareaRef,
    autoResize,
    insertText,
    clearEditor
} = useEditor(form, isTranslating)

const mainScrollRef = ref(null)
const userScrolledUp = ref(false)

function handleMainScroll() {
    if (!mainScrollRef.value) return
    const { scrollTop, scrollHeight, clientHeight } = mainScrollRef.value
    // If user is not at the bottom (with tolerance of 100px)
    if (scrollHeight - scrollTop - clientHeight > 100) {
        userScrolledUp.value = true
    } else {
        // If user scrolls back to bottom, resume following
        userScrolledUp.value = false
    }
}

// Auto-scroll logic
watch(() => form.value.content, async () => {
    if (isTranslating.value && !userScrolledUp.value && mainScrollRef.value) {
        await nextTick()
        mainScrollRef.value.scrollTop = mainScrollRef.value.scrollHeight
    }
})

watch(isTranslating, async (val) => {
    if (val) {
        userScrolledUp.value = false
        if (mainScrollRef.value) {
            await nextTick()
            mainScrollRef.value.scrollTop = mainScrollRef.value.scrollHeight
        }
    }
})

// Fix for editing section cutting off when switching back from preview
const previewMode = ref(false)

watch(previewMode, async (val) => {
    if (!val) {
        await nextTick()
        autoResize()
    }
})

// Computed for UI

const wordCount = computed(() => {
    const text = form.value.content?.trim()
    if (!text) return 0
    return text.split(/\s+/).filter(Boolean).length
})

const charCount = computed(() => form.value.content?.length || 0)

const renderedContent = computed(() => {
    return form.value.content ? marked(form.value.content) : ''
})

// Event Handlers
async function handleNovelChange(event) {
    // Pass loadPresets as callback to refresh presets when novel changes
    await _handleNovelChange(event, loadPresets)
}

function insertSynopsis() {
    if (novel.value?.synopsis) {
        translationNote.value = (translationNote.value ? translationNote.value + '\n\n' : '') + `Synopsis:\n${novel.value.synopsis}`
        showContext.value = true
    }
}

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

// Lifecycle
onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)

  // Wait for auth to be ready before enforcing access control
  watch(() => auth.isReady, (ready) => {
      if (ready) {
          if (auth.user && !auth.isSuperAdmin) {
              // User is logged in but not admin -> Home
              router.push('/')
          }
           // If not logged in, we might want to redirect to login, but following existing logic:
           // If auth.user is null, we do nothing (maybe allowed for setup? or handled elsewhere)
      }
  }, { immediate: true })

  await loadNovels()

  if (isEdit.value) {
      await loadChapter(route.params.chapterId)
  } else if (novelSlug.value) {
      await loadNovelBySlug(novelSlug.value)
  }

  await loadPresets()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// Watch for route changes to reload data
watch(() => route.params.chapterId, async (newId) => {
    if (newId) {
        await loadChapter(newId)
    } else {
        // Reset for "New" mode
        form.value = {
            title: '',
            chapter_number: 1,
            content: '',
            published_at: new Date().toISOString()
        }
        if (novelSlug.value) {
            await loadNovelBySlug(novelSlug.value)
        }
    }
})

watch(() => route.params.slug, async (newSlug) => {
    // Only reload novel if we aren't already loading a specific chapter
    if (newSlug && !route.params.chapterId) {
        await loadNovelBySlug(newSlug)
    }
})
</script>

<template>
  <div class="h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col overflow-hidden">
    <!-- Compact Toolbar -->
    <header class="h-11 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 z-50 flex items-center justify-between px-3 shrink-0">
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
             
             
             <!-- Release Date -->
             <div class="flex items-center gap-1.5 shrink-0 ml-2">
                 <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-neutral-400"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                 <input 
                    v-model="form.published_at" 
                    class="bg-transparent text-[10px] font-medium text-neutral-500 outline-none border-b border-transparent hover:border-neutral-300 dark:hover:border-neutral-700 focus:border-blue-500 max-w-[120px]"
                    placeholder="Release Date..."
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

    <div class="flex-1 flex min-h-0 relative overflow-hidden">
        <!-- Translator Panel (Collapsible, Compact) -->
        <aside v-if="showTranslation" class="w-96 lg:w-[28rem] border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex flex-col z-10 shrink-0 h-full overflow-y-auto">
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

             <!-- AI Settings (Collapsible) -->
             <div class="border-t border-neutral-200 dark:border-neutral-800">
                 <button @click="showSettings = !showSettings" class="w-full px-3 py-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition">
                     <span class="flex items-center gap-1.5">
                         AI Settings
                         <span v-if="aiSettings.temperature !== 0.7 || aiSettings.reasoning" class="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                     </span>
                     <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="{'rotate-180': showSettings}" class="transition-transform"><path d="m6 9 6 6 6-6"/></svg>
                 </button>
                 <div v-show="showSettings" class="px-3 pb-3 space-y-2.5">
                     <!-- Preset Selector -->
                     <div>
                         <label class="text-[10px] text-neutral-500 mb-1 block">Preset</label>
                         <div class="flex items-center gap-1.5">
                             <select 
                                 :value="activePresetId" 
                                 @change="handlePresetChange"
                                 class="flex-1 appearance-none px-2 py-1.5 text-[11px] bg-white dark:bg-neutral-950 rounded border border-neutral-200 dark:border-neutral-800 focus:border-blue-500 outline-none cursor-pointer truncate"
                             >
                                 <option value="__new__">+ New Preset</option>
                                 <option v-for="p in presetsList" :key="p.id" :value="p.id">
                                     {{ p.name }}{{ p.is_default ? ' ★' : '' }}{{ p.novel_id ? ' (novel)' : '' }}
                                 </option>
                             </select>
                             <button v-if="activePresetId" @click="deletePreset" class="p-1 text-neutral-400 hover:text-red-500 transition shrink-0" title="Delete preset">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                             </button>
                         </div>
                     </div>

                     <!-- Model -->
                     <div>
                         <label class="text-[10px] text-neutral-500 mb-1 block">Model</label>
                         <input 
                             v-model="aiSettings.model" 
                             class="w-full px-2 py-1.5 text-[11px] font-mono bg-white dark:bg-neutral-950 rounded border border-neutral-200 dark:border-neutral-800 focus:border-blue-500 outline-none" 
                             placeholder="openrouter/pony-alpha" 
                         />
                     </div>

                     <!-- System Prompt -->
                     <div>
                         <button @click="showPromptEditor = !showPromptEditor" class="flex items-center gap-1.5 text-[10px] text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 mb-1 transition">
                             <span>System Prompt</span>
                             <span class="text-[9px] font-mono text-neutral-400">({{ aiSettings.system_prompt?.length || 0 }} chars)</span>
                             <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="{'rotate-180': showPromptEditor}" class="transition-transform"><path d="m6 9 6 6 6-6"/></svg>
                         </button>
                         <textarea 
                             v-if="showPromptEditor"
                             v-model="aiSettings.system_prompt" 
                             rows="10"
                             class="w-full px-2.5 py-2 text-[10px] leading-relaxed bg-white dark:bg-neutral-950 rounded border border-neutral-200 dark:border-neutral-800 focus:border-blue-500 outline-none resize-y font-mono"
                             placeholder="Enter system instructions for the AI translator..."
                         ></textarea>
                     </div>

                     <!-- Temperature -->
                     <div>
                         <div class="flex items-center justify-between mb-1">
                             <label class="text-[10px] text-neutral-500">Temperature</label>
                             <span class="text-[10px] font-mono text-neutral-400">{{ aiSettings.temperature.toFixed(2) }}</span>
                         </div>
                         <input type="range" v-model.number="aiSettings.temperature" min="0" max="2" step="0.05" class="w-full h-1 accent-blue-500 cursor-pointer" />
                     </div>
                     <!-- Top P -->
                     <div>
                         <div class="flex items-center justify-between mb-1">
                             <label class="text-[10px] text-neutral-500">Top P</label>
                             <span class="text-[10px] font-mono text-neutral-400">{{ aiSettings.top_p.toFixed(2) }}</span>
                         </div>
                         <input type="range" v-model.number="aiSettings.top_p" min="0" max="1" step="0.05" class="w-full h-1 accent-blue-500 cursor-pointer" />
                     </div>
                     <!-- Top K -->
                     <div>
                         <div class="flex items-center justify-between mb-1">
                             <label class="text-[10px] text-neutral-500">Top K</label>
                             <span class="text-[10px] font-mono text-neutral-400">{{ aiSettings.top_k }}</span>
                         </div>
                         <input type="range" v-model.number="aiSettings.top_k" min="0" max="100" step="1" class="w-full h-1 accent-blue-500 cursor-pointer" />
                     </div>
                     <!-- Max Tokens -->
                     <div>
                         <div class="flex items-center justify-between mb-1">
                             <label class="text-[10px] text-neutral-500">Max Tokens</label>
                             <span class="text-[10px] font-mono text-neutral-400">{{ aiSettings.max_tokens.toLocaleString() }}</span>
                         </div>
                         <input type="range" v-model.number="aiSettings.max_tokens" min="512" max="32768" step="512" class="w-full h-1 accent-blue-500 cursor-pointer" />
                     </div>
                     <!-- Reasoning Toggle -->
                     <div class="flex items-center justify-between">
                         <label class="text-[10px] text-neutral-500">Reasoning / Thinking</label>
                         <button 
                             @click="aiSettings.reasoning = !aiSettings.reasoning" 
                             :class="aiSettings.reasoning ? 'bg-blue-600' : 'bg-neutral-300 dark:bg-neutral-700'"
                             class="relative w-7 h-4 rounded-full transition-colors"
                         >
                             <span :class="aiSettings.reasoning ? 'translate-x-3.5' : 'translate-x-0.5'" class="absolute top-0.5 left-0 w-3 h-3 bg-white rounded-full transition-transform shadow-sm"></span>
                         </button>
                     </div>
                     <!-- Reset -->
                     <button @click="resetToDefault" class="text-[9px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 underline">
                         Reset to defaults
                     </button>

                     <!-- Save / Actions -->
                     <div class="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800">
                         <button @click="loadPresets" class="text-[9px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 underline">
                             Reload presets
                         </button>
                         <button 
                             @click="saveCurrentPreset" 
                             :disabled="savingPreset"
                             class="text-[10px] font-semibold text-blue-600 hover:text-blue-500 disabled:opacity-40 flex items-center gap-1"
                         >
                             <svg v-if="savingPreset" class="animate-spin h-2.5 w-2.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                             {{ savingPreset ? 'Saving...' : 'Save Preset' }}
                         </button>
                     </div>
                 </div>
             </div>

             <!-- Translate Action -->
             <div class="px-3 pb-3 space-y-2 shrink-0">
                 <!-- Translation Status -->
                 <div v-if="isTranslating" class="px-2.5 py-2 bg-neutral-100 dark:bg-neutral-800 rounded border border-neutral-200 dark:border-neutral-700 space-y-1.5">
                     <div class="flex items-center justify-between">
                         <div class="flex items-center gap-1.5">
                             <!-- Phase icon -->
                             <span v-if="translationPhase === 'connecting'" class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                             <span v-else-if="translationPhase === 'thinking'" class="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                             <span v-else-if="translationPhase === 'streaming'" class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                             
                             <span class="text-[10px] font-semibold" :class="{
                                 'text-yellow-600 dark:text-yellow-400': translationPhase === 'connecting',
                                 'text-purple-600 dark:text-purple-400': translationPhase === 'thinking',
                                 'text-green-600 dark:text-green-400': translationPhase === 'streaming',
                             }">
                                 {{ translationPhase === 'connecting' ? 'Connecting to API...' : '' }}
                                 {{ translationPhase === 'thinking' ? 'Model is thinking...' : '' }}
                                 {{ translationPhase === 'streaming' ? 'Receiving translation...' : '' }}
                             </span>
                         </div>
                         <span class="text-[9px] font-mono text-neutral-400">{{ formatElapsed(translationElapsed) }}</span>
                     </div>
                     <!-- Progress details -->
                     <div class="flex items-center gap-3 text-[9px] text-neutral-400">
                         <span v-if="translationTokens > 0">{{ translationTokens }} tokens</span>
                         <span v-if="reasoningContent" class="text-purple-400">thinking...</span>
                     </div>
                 </div>

                 <!-- Reasoning Output (if any) -->
                 <details v-if="reasoningContent" class="text-[10px]">
                     <summary class="cursor-pointer text-purple-500 hover:text-purple-400 font-medium py-1">View model reasoning</summary>
                     <pre class="mt-1 px-2 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded border border-purple-100 dark:border-purple-900/30 text-[9px] leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">{{ reasoningContent }}</pre>
                 </details>

                 <p v-if="translationError" class="px-2.5 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[11px] rounded border border-red-100 dark:border-red-900/30 line-clamp-2">
                     {{ translationError }}
                 </p>
                 <div class="flex gap-2">
                     <button 
                        type="button" 
                        @click="translate" 
                        :disabled="isTranslating || !japaneseText"
                        class="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-md transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                     >
                        <svg v-if="isTranslating" class="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        {{ isTranslating ? 'Translating...' : 'Translate' }}
                     </button>
                     <button 
                        v-if="isTranslating"
                        type="button" 
                        @click="cancelTranslation"
                        class="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-md transition"
                        title="Cancel translation"
                     >
                        Stop
                     </button>
                 </div>
             </div>
        </aside>

        <!-- Main Editor Area -->
        <main 
            ref="mainScrollRef"
            @scroll="handleMainScroll"
            class="flex-1 min-w-0 h-full overflow-y-auto pb-32"
        >
            <div class="max-w-5xl mx-auto px-8 py-5 min-h-full">
                
                <div v-if="!previewMode" class="flex flex-col">
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
                        class="w-full min-h-[500px] resize-none outline-none text-[15px] leading-[1.8] text-neutral-800 dark:text-neutral-200 bg-transparent placeholder:text-neutral-300 dark:placeholder:text-neutral-700 overflow-hidden"
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
    <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="translate-y-2 opacity-0" enter-to-class="translate-y-0 opacity-100" leave-active-class="transition duration-150 ease-in" leave-from-class="translate-y-0 opacity-100" leave-to-class="translate-y-2 opacity-0">
        <div v-if="successMsg" class="fixed bottom-4 right-4 bg-emerald-600 text-white px-3.5 py-2 rounded-lg shadow-lg text-xs font-medium flex items-center gap-2 z-50">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            {{ successMsg }}
            <button @click="successMsg = ''" class="ml-1 opacity-70 hover:opacity-100">&times;</button>
        </div>
    </Transition>
  </div>
</template>
