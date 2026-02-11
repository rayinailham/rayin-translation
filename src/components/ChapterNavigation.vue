<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useNovelStore } from '../stores/novel'

const props = defineProps({
  novelSlug: { type: String, required: true },
  chapterNumber: { type: [Number, String], required: true },
  allChapters: { type: Array, default: () => [] }
})

const router = useRouter()
const novelStore = useNovelStore()

// ── Computed ──
const currentIdx = computed(() =>
  props.allChapters.findIndex(c => c.chapter_number == props.chapterNumber)
)

const prevChapter = computed(() =>
  currentIdx.value > 0 ? props.allChapters[currentIdx.value - 1] : null
)

const nextChapter = computed(() =>
  currentIdx.value >= 0 && currentIdx.value < props.allChapters.length - 1
    ? props.allChapters[currentIdx.value + 1]
    : null
)

const currentTitle = computed(() => {
    const ch = props.allChapters[currentIdx.value]
    return ch ? ch.title : ''
})

// ── Actions ──
const goChapter = (num) => {
  router.push({ name: 'chapter', params: { slug: props.novelSlug, chapter: num } })
}

const prefetchChapter = (num) => {
  novelStore.prefetchChapter(props.novelSlug, num)
}

const onChapterChange = (e) => {
  const num = e.target.value
  if (num) goChapter(num)
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4">
    <div class="flex items-center gap-1.5 md:gap-3 h-11 md:h-12">
      
      <!-- Previous Button -->
      <router-link 
        v-if="prevChapter" 
        :to="{ name: 'chapter', params: { slug: props.novelSlug, chapter: prevChapter.chapter_number } }"
        @mouseenter="prefetchChapter(prevChapter.chapter_number)"
        class="flex-none flex items-center justify-center w-11 md:w-auto md:px-4 h-full rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all group"
        title="Previous Chapter"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="md:mr-1.5">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        <span class="hidden md:inline text-xs font-black uppercase tracking-widest">Prev</span>
      </router-link>
      <div v-else class="flex-none w-11 md:w-28 h-full rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 flex items-center justify-center opacity-30 select-none">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
      </div>

      <!-- Chapter Selector (Middle) -->
      <div class="flex-1 min-w-0 h-full relative group">
        <div class="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none text-neutral-400 group-hover:text-neutral-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 6h16M4 12h16M4 18h7"/>
            </svg>
        </div>

        <select 
          :value="chapterNumber"
          @change="onChapterChange"
          aria-label="Select chapter"
          class="w-full h-full pl-10 pr-10 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-center text-[13px] md:text-sm font-bold text-neutral-700 dark:text-neutral-200 appearance-none cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all outline-none"
        >
          <option v-for="ch in allChapters" :key="ch.id" :value="ch.chapter_number" class="bg-white dark:bg-neutral-900 text-black dark:text-white">
            Chapter {{ ch.chapter_number }}: {{ ch.title }}
          </option>
        </select>

        <div class="absolute inset-y-0 right-0 pr-3 md:pr-4 flex items-center pointer-events-none text-neutral-400 group-hover:text-neutral-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="m6 9 6 6 6-6"/>
            </svg>
        </div>
      </div>

      <!-- Next Button -->
      <router-link 
        v-if="nextChapter" 
        :to="{ name: 'chapter', params: { slug: props.novelSlug, chapter: nextChapter.chapter_number } }"
        @mouseenter="prefetchChapter(nextChapter.chapter_number)"
        class="flex-none flex items-center justify-center w-11 md:w-auto md:px-4 h-full rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-black border border-transparent hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-black/5"
        title="Next Chapter"
      >
        <span class="hidden md:inline text-xs font-black uppercase tracking-widest md:ml-1">Next</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="md:ml-1.5">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </router-link>
      <div v-else class="flex-none w-11 md:w-28 h-full rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 flex items-center justify-center opacity-30 select-none">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Optional: improve truncation appearance if title is extremely long inside select */
select {
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}
</style>
