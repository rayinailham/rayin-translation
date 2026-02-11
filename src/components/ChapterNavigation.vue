<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useNovelStore } from '../stores/novel'

const props = defineProps({
  novelSlug: { type: String, required: true },
  chapterNumber: { type: [Number, String], required: true },
  allChapters: { type: Array, default: () => [] }
})

const router = useRouter()
const route = useRoute()
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
  <nav class="max-w-3xl mx-auto px-4 pb-6">
    <div class="flex gap-2">

      <!-- Prev -->
      <button v-if="prevChapter" @click="goChapter(prevChapter.chapter_number)"
        @mouseenter="prefetchChapter(prevChapter.chapter_number)"
        class="flex-1 p-3 border border-neutral-200 dark:border-neutral-800 rounded-lg text-left hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition min-w-0 group"
        title="Previous Chapter">
        <span class="text-[12px] text-neutral-400 uppercase tracking-wider block group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors">Previous</span>
        <span class="text-sm font-medium truncate block mt-0.5">
          <span class="text-neutral-500 mr-1">Ch.{{ prevChapter.chapter_number }}</span> {{ prevChapter.title }}
        </span>
      </button>
      <div v-else class="flex-1 opacity-50 p-3 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg flex items-center justify-center text-xs text-neutral-400 select-none">
          Start
      </div>

      <!-- Chapter Select (Middle) -->
      <div class="relative flex-shrink-0 w-16 sm:w-auto flex items-center justify-center border border-neutral-200 dark:border-neutral-800 rounded-lg hover:border-neutral-300 dark:hover:border-neutral-700 transition group bg-white dark:bg-black">
        <select 
          :value="chapterNumber"
          @change="onChapterChange"
          class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          title="Jump to Chapter"
        >
          <option v-for="ch in allChapters" :key="ch.id" :value="ch.chapter_number">
            Chapter {{ ch.chapter_number }} - {{ ch.title }}
          </option>
        </select>
        
        <div class="px-3 py-2 flex items-center justify-center gap-2 pointer-events-none">
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              class="text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors">
              <line x1="8" x2="21" y1="6" y2="6" />
              <line x1="8" x2="21" y1="12" y2="12" />
              <line x1="8" x2="21" y1="18" y2="18" />
              <line x1="3" x2="3.01" y1="6" y2="6" />
              <line x1="3" x2="3.01" y1="12" y2="12" />
              <line x1="3" x2="3.01" y1="18" y2="18" />
            </svg>
            <span class="hidden sm:inline text-xs font-bold text-neutral-500 uppercase tracking-wider">Index</span>
        </div>
      </div>

      <!-- Next -->
      <button v-if="nextChapter" @click="goChapter(nextChapter.chapter_number)"
        @mouseenter="prefetchChapter(nextChapter.chapter_number)"
        class="flex-1 p-3 border border-neutral-200 dark:border-neutral-800 rounded-lg text-right hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition min-w-0 group"
        title="Next Chapter">
        <span class="text-[12px] text-neutral-400 uppercase tracking-wider block group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors">Next</span>
        <span class="text-sm font-medium truncate block mt-0.5">
          {{ nextChapter.title }} <span class="text-neutral-500 ml-1">Ch.{{ nextChapter.chapter_number }}</span>
        </span>
      </button>
      <div v-else class="flex-1 opacity-50 p-3 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg flex items-center justify-center text-xs text-neutral-400 select-none">
          End
      </div>
    </div>
  </nav>
</template>
