
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  novelSlug: String,
  novelTitle: String,
  chapters: Array,
  currentChapterNumber: Number,
  fontSize: Number,
  fontFamily: String,
  isOpen: Boolean
})

const emit = defineEmits(['update:fontSize', 'update:fontFamily', 'close'])
const router = useRouter()

const goToChapter = (num) => {
    router.push({ name: 'chapter', params: { slug: props.novelSlug, chapter: num } })
    emit('close')
}

const fonts = [
    { name: 'Poppins', value: 'Poppins, sans-serif' },
    { name: 'Serif', value: 'Merriweather, serif' },
    { name: 'Mono', value: 'monospace' }
]

// ── Theme Toggle ──
const currentTheme = ref(localStorage.getItem('theme') || 'system')

function setTheme(theme) {
    currentTheme.value = theme
    localStorage.setItem('theme', theme)
    const html = document.documentElement
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        html.classList.add('dark')
    } else {
        html.classList.remove('dark')
    }
}

const goHome = () => {
    router.push({ name: 'home' })
    emit('close')
}
</script>

<template>
  <div 
    class="fixed inset-y-0 right-0 w-80 bg-white dark:bg-[#18181b] border-l border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out z-[60] flex flex-col shadow-2xl"
    :class="isOpen ? 'translate-x-0' : 'translate-x-full'"
  >
    <!-- Header -->
    <div class="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-[#18181b]">
        <h2 class="font-bold text-lg">Settings</h2>
        <button @click="$emit('close')" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-4 space-y-8">
        
        <!-- Appearance -->
        <section>
            <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Appearance</h3>
            
            <div class="space-y-4">
                <!-- Theme -->
                <div>
                    <label class="text-sm font-medium block mb-2">Theme</label>
                    <div class="grid grid-cols-3 gap-2">
                        <button
                            v-for="t in [{ key: 'system', label: 'System' }, { key: 'light', label: 'Light' }, { key: 'dark', label: 'Dark' }]"
                            :key="t.key"
                            @click="setTheme(t.key)"
                            class="px-3 py-2 text-sm border rounded-md transition"
                            :class="currentTheme === t.key ? 'bg-black text-white dark:bg-white dark:text-black border-transparent' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'"
                        >
                            {{ t.label }}
                        </button>
                    </div>
                </div>

                <!-- Font Family -->
                <div>
                     <label class="text-sm font-medium block mb-2">Font Type</label>
                     <div class="grid grid-cols-3 gap-2">
                         <button 
                            v-for="font in fonts" 
                            :key="font.name"
                            @click="$emit('update:fontFamily', font.value)"
                            class="px-3 py-2 text-sm border rounded-md transition"
                            :class="fontFamily === font.value ? 'bg-black text-white dark:bg-white dark:text-black border-transparent' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'"
                         >
                            {{ font.name }}
                         </button>
                     </div>
                </div>

                <!-- Font Size -->
                <div>
                    <label class="text-sm font-medium block mb-2">Font Size: {{ fontSize }}px</label>
                    <input 
                        type="range" 
                        min="14" 
                        max="24" 
                        step="1" 
                        :value="fontSize" 
                        @input="$emit('update:fontSize', parseInt($event.target.value))"
                        class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    >
                    <div class="flex justify-between text-xs text-gray-400 mt-1">
                        <span>A</span>
                        <span>A</span>
                    </div>
                </div>
            </div>
        </section>

        <!-- Chapter Nav -->
        <section>
             <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Navigation</h3>
             <div class="space-y-1">
                 <div class="text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">{{ novelTitle }}</div>
                 <div class="max-h-96 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-lg">
                    <button 
                        v-for="c in chapters" 
                        :key="c.id"
                        @click="goToChapter(c.chapter_number)"
                        class="w-full text-left px-4 py-3 text-sm border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition flex items-center gap-3"
                        :class="c.chapter_number == currentChapterNumber ? 'bg-black/5 dark:bg-white/10 font-medium' : ''"
                    >
                        <span class="text-xs text-gray-400 w-6">#{{ c.chapter_number }}</span>
                        <span class="truncate">{{ c.title }}</span>
                    </button>
                 </div>
             </div>
        </section>

        <!-- Extra Navigation -->
        <section>
            <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Links</h3>
            <div class="space-y-1">
                <button @click="goHome" class="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    Home
                </button>
            </div>
        </section>
    </div>
  </div>

  <!-- Side Navigation (No Backdrop) -->
</template>
