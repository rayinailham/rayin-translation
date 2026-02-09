<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabase'
import ChapterSidebar from '../components/ChapterSidebar.vue'
import NovelRecommendations from '../components/NovelRecommendations.vue'
import SiteFooter from '../components/SiteFooter.vue'

const route = useRoute()
const router = useRouter()

const novel = ref(null)
const chapter = ref(null)
const allChapters = ref([])
const sidebarOpen = ref(false)
const loaded = ref(false)

// ── Reader Settings (persisted) ──
const fontSize = ref(parseInt(localStorage.getItem('readerFontSize') || '18'))
const fontFamily = ref(localStorage.getItem('readerFontFamily') || 'Poppins, sans-serif')

watch(fontSize, (v) => localStorage.setItem('readerFontSize', v))
watch(fontFamily, (v) => localStorage.setItem('readerFontFamily', v))

// ── Prev / Next ──
const currentIdx = computed(() =>
  allChapters.value.findIndex(c => c.chapter_number == chapter.value?.chapter_number)
)

const prevChapter = computed(() =>
  currentIdx.value > 0 ? allChapters.value[currentIdx.value - 1] : null
)

const nextChapter = computed(() =>
  currentIdx.value >= 0 && currentIdx.value < allChapters.value.length - 1
    ? allChapters.value[currentIdx.value + 1]
    : null
)

// ── Render Markdown ──
const renderedContent = computed(() => {
  if (!chapter.value?.content) return ''
  if (typeof window.marked?.parse === 'function') {
    return window.marked.parse(chapter.value.content)
  }
  // Fallback: newlines to <br>
  return chapter.value.content.replace(/\n/g, '<br>')
})

// ── Data Fetching ──
async function fetchData() {
  const slug = route.params.slug
  const chapterNum = route.params.chapter

  const { data: novelData } = await supabase
    .from('novels')
    .select('*')
    .eq('slug', slug)
    .single()

  if (novelData) {
    novel.value = novelData

    const { data: chaptersData } = await supabase
      .from('chapters')
      .select('id, chapter_number, title')
      .eq('novel_id', novelData.id)
      .order('chapter_number', { ascending: true })

    if (chaptersData) allChapters.value = chaptersData

    const { data: chapterData } = await supabase
      .from('chapters')
      .select('*')
      .eq('novel_id', novelData.id)
      .eq('chapter_number', chapterNum)
      .single()

    if (chapterData) {
      chapter.value = chapterData
      // Increment view count
      supabase.from('chapters')
        .update({ views: (chapterData.views || 0) + 1 })
        .eq('id', chapterData.id)
        .then(() => {}) // Fire and forget
    }
  }

  loaded.value = true
  await nextTick()
  window.scrollTo({ top: 0, behavior: 'instant' })
}

onMounted(fetchData)
watch(() => route.params.chapter, fetchData)
watch(() => route.params.slug, fetchData)

// ── Navigation ──
const goChapter = (num) =>
  router.push({ name: 'chapter', params: { slug: route.params.slug, chapter: num } })
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-black transition-all duration-300 ease-in-out" :class="{ 'md:pr-80': sidebarOpen }">

    <!-- ───── Top Bar ───── -->
    <header
      class="sticky top-0 z-30 bg-white/90 dark:bg-black/90 backdrop-blur border-b border-neutral-100 dark:border-neutral-800">
      <div class="max-w-3xl mx-auto px-4 h-12 flex items-center justify-between">
        <div class="flex items-center gap-3 min-w-0 mr-4">
          <router-link to="/" class="flex items-center gap-1.5 text-sm font-bold tracking-tight hover:opacity-80 transition flex-shrink-0">
            <img src="/Logo Rayin Translation.png" alt="Rayin Translation" class="h-5 w-5 object-contain" />
            Rayin Translation
          </router-link>
          <span class="text-neutral-300 dark:text-neutral-700 flex-shrink-0">/</span>
          <router-link :to="{ name: 'novel', params: { slug: route.params.slug } }"
            class="text-sm text-neutral-500 hover:text-black dark:hover:text-white transition truncate">
            {{ novel?.title || 'Back' }}
          </router-link>
        </div>
      </div>
    </header>

    <template v-if="chapter">

      <!-- ───── Chapter Content ───── -->
      <article class="max-w-3xl mx-auto px-4 py-10 md:py-14">
        <div class="mb-10">
          <h1 class="text-lg md:text-xl font-bold">Chapter {{ chapter.chapter_number }}</h1>
          <p class="text-neutral-500 text-sm mt-1">{{ chapter.title }}</p>
        </div>

        <div class="prose dark:prose-invert max-w-none prose-neutral prose-sm md:prose-base
                     prose-p:my-4 prose-headings:mt-8 prose-headings:mb-4"
          :style="{ fontSize: fontSize + 'px', fontFamily, lineHeight: '1.9' }" v-html="renderedContent" />
      </article>

      <!-- ───── Bottom Navigation ───── -->
      <nav class="max-w-3xl mx-auto px-4 pb-6">
        <div class="flex gap-2">

          <!-- Prev -->
          <button v-if="prevChapter" @click="goChapter(prevChapter.chapter_number)"
            class="flex-1 p-3 border border-neutral-200 dark:border-neutral-800 rounded-lg text-left hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition min-w-0">
            <span class="text-[10px] text-neutral-400 uppercase tracking-wider block">Previous</span>
            <span class="text-sm font-medium truncate block mt-0.5">
              Ch.{{ prevChapter.chapter_number }} – {{ prevChapter.title }}
            </span>
          </button>
          <div v-else class="flex-1" />

          <!-- TOC -->
          <router-link :to="{ name: 'novel', params: { slug: route.params.slug } }"
            class="px-5 flex items-center justify-center border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition flex-shrink-0"
            title="Table of Contents">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="8" x2="21" y1="6" y2="6" />
              <line x1="8" x2="21" y1="12" y2="12" />
              <line x1="8" x2="21" y1="18" y2="18" />
              <line x1="3" x2="3.01" y1="6" y2="6" />
              <line x1="3" x2="3.01" y1="12" y2="12" />
              <line x1="3" x2="3.01" y1="18" y2="18" />
            </svg>
          </router-link>

          <!-- Next -->
          <button v-if="nextChapter" @click="goChapter(nextChapter.chapter_number)"
            class="flex-1 p-3 border border-neutral-200 dark:border-neutral-800 rounded-lg text-right hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition min-w-0">
            <span class="text-[10px] text-neutral-400 uppercase tracking-wider block">Next</span>
            <span class="text-sm font-medium truncate block mt-0.5">
              Ch.{{ nextChapter.chapter_number }} – {{ nextChapter.title }}
            </span>
          </button>
          <div v-else class="flex-1" />
        </div>

        <!-- Recommendations -->
        <NovelRecommendations :excludeNovelId="novel?.id" />
      </nav>
      </template>

    <!-- Not found -->
    <div v-else-if="loaded" class="text-center py-32">
      <p class="text-neutral-500">Chapter not found.</p>
      <router-link :to="{ name: 'novel', params: { slug: route.params.slug } }"
        class="mt-4 text-sm underline underline-offset-2 inline-block">
        Back to Novel
      </router-link>
    </div>

    <!-- ───── Footer ───── -->
    <SiteFooter />

    <!-- ───── Floating Settings Button ───── -->
    <button 
      v-if="!sidebarOpen"
      @click="sidebarOpen = true"
      class="fixed bottom-6 right-6 z-40 p-3.5 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl hover:scale-110 active:scale-95 transition-all group lg:bottom-10 lg:right-10"
      aria-label="Settings"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        class="text-neutral-600 dark:text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors">
        <path
          d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </button>

    <!-- ───── Sidebar ───── -->
    <ChapterSidebar :isOpen="sidebarOpen" :novelSlug="route.params.slug" :novelTitle="novel?.title || ''"
      :chapters="allChapters" :currentChapterNumber="chapter?.chapter_number" :fontSize="fontSize"
      :fontFamily="fontFamily" @update:fontSize="fontSize = $event" @update:fontFamily="fontFamily = $event"
      @close="sidebarOpen = false" />
  </div>
</template>
