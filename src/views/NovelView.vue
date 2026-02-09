<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabase'
import NovelRecommendations from '../components/NovelRecommendations.vue'
import SiteFooter from '../components/SiteFooter.vue'

const route = useRoute()
const router = useRouter()

const novel = ref(null)
const chapters = ref([])
const loaded = ref(false)

// ── Computed ──
const genres = computed(() => {
  if (!novel.value?.genres) return []
  const g = novel.value.genres
  if (Array.isArray(g)) return g
  try { return JSON.parse(g) } catch { return g.split(',').map(s => s.trim()) }
})

const tags = computed(() => {
  if (!novel.value?.tags) return []
  const t = novel.value.tags
  if (Array.isArray(t)) return t
  try { return JSON.parse(t) } catch { return t.split(',').map(s => s.trim()) }
})

const sortedChapters = computed(() =>
  [...chapters.value].sort((a, b) => a.chapter_number - b.chapter_number)
)

const chapterCount = computed(() => chapters.value.length)

const ratingStars = computed(() => {
  const r = novel.value?.rating || 0
  return Array.from({ length: 5 }, (_, i) => i < Math.round(r))
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
}

// ── Fetch ──
async function fetchData() {
  const slug = route.params.slug
  loaded.value = false

  const { data: novelData } = await supabase
    .from('novels')
    .select('*')
    .eq('slug', slug)
    .single()

  if (novelData) {
    novel.value = novelData

    const { data: chapterData } = await supabase
      .from('chapters')
      .select('id, chapter_number, title, created_at')
      .eq('novel_id', novelData.id)
      .order('chapter_number', { ascending: true })

    if (chapterData) chapters.value = chapterData
  }

  loaded.value = true
}

onMounted(fetchData)
watch(() => route.params.slug, fetchData)

// ── Navigation ──
const goChapter = (num) =>
  router.push({ name: 'chapter', params: { slug: route.params.slug, chapter: num } })
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-neutral-950 transition-colors">

    <!-- ───── Header ───── -->
    <header
      class="sticky top-0 z-40 bg-white/80 dark:bg-neutral-950/80 backdrop-blur border-b border-neutral-200 dark:border-neutral-800">
      <div class="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
        <router-link to="/" class="flex items-center gap-2 text-lg font-bold tracking-tight hover:opacity-80 transition flex-shrink-0">
          <img src="/Logo Rayin Translation.png" alt="Rayin Translation" class="h-6 w-6 object-contain" />
          Rayin Translation
        </router-link>
        <span class="text-neutral-300 dark:text-neutral-700">/</span>
        <span class="text-sm text-neutral-500 truncate">{{ novel?.title }}</span>
      </div>
    </header>

    <template v-if="novel">

      <!-- ───── Novel Info ───── -->
      <div class="max-w-5xl mx-auto px-4 pt-10 pb-8">
        <div class="flex flex-col sm:flex-row gap-6 sm:gap-8">

          <!-- Cover -->
          <div class="w-36 sm:w-44 flex-shrink-0 mx-auto sm:mx-0">
            <div class="relative aspect-[2/3] rounded-lg overflow-hidden shadow-md">
              <img :src="novel.image_url" class="w-full h-full object-cover" alt="" />
            </div>
          </div>

          <!-- Details -->
          <div class="flex-1 min-w-0 text-center sm:text-left">
            <h1 class="text-xl sm:text-2xl font-bold leading-tight text-neutral-900 dark:text-neutral-50">{{ novel.title }}</h1>

            <div v-if="novel.romaji_title" class="text-sm text-neutral-500 italic mt-1">{{ novel.romaji_title }}</div>
            <div v-if="novel.original_jp_title" class="text-xs text-neutral-400 mt-0.5">{{ novel.original_jp_title }}</div>

            <!-- Author -->
            <div class="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
              <span>by <span class="font-medium text-neutral-900 dark:text-neutral-100">{{ novel.author_romaji || novel.author || 'Unknown' }}</span></span>
              <span v-if="novel.author_romaji && novel.author" class="text-neutral-400"> ({{ novel.author }})</span>
            </div>

            <!-- Inline Stats -->
            <div class="flex flex-wrap justify-center sm:justify-start items-center gap-x-4 gap-y-1 mt-4 text-xs text-neutral-500">
              <span v-if="novel.status" class="flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full" :class="novel.status === 'Ongoing' ? 'bg-green-500' : 'bg-neutral-400'" />
                {{ novel.status }}
              </span>
              <span>{{ chapterCount }} chapters</span>
              <span v-if="novel.rating" class="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="text-amber-400"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                {{ novel.rating }}
              </span>
              <span>{{ (novel.views || 0).toLocaleString() }} views</span>
            </div>

            <!-- Genres -->
            <div v-if="genres.length" class="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-4">
              <span v-for="g in genres" :key="g"
                class="px-2.5 py-0.5 text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-md capitalize">
                {{ g }}
              </span>
            </div>

            <!-- Tags -->
            <div v-if="tags.length" class="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-2">
              <span v-for="t in tags" :key="t"
                class="text-[10px] text-neutral-400 uppercase tracking-wider">
                #{{ t }}
              </span>
            </div>

            <!-- Start Reading -->
            <div class="mt-6 flex justify-center sm:justify-start">
              <button v-if="sortedChapters.length" @click="goChapter(sortedChapters[0].chapter_number)"
                class="px-6 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-semibold rounded-lg hover:opacity-90 active:scale-[0.98] transition-all">
                Start Reading
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ───── Content ───── -->
      <div class="max-w-5xl mx-auto px-4 pb-16">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-10">

          <!-- Main Column -->
          <div class="lg:col-span-2 space-y-10">

            <!-- Synopsis -->
            <section>
              <h2 class="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-3">Synopsis</h2>
              <p class="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400 whitespace-pre-line">
                {{ novel.synopsis || 'No synopsis available.' }}
              </p>
            </section>

            <!-- Chapters -->
            <section id="chapters">
              <h2 class="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-3">{{ chapterCount }} Chapters</h2>

              <div class="border border-neutral-200 dark:border-neutral-800 rounded-lg divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
                <div v-for="ch in sortedChapters.slice().reverse()" :key="ch.id" @click="goChapter(ch.chapter_number)"
                  class="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition text-sm group">
                  <div class="flex items-center gap-3 min-w-0">
                    <span class="text-neutral-400 font-mono text-xs w-7 flex-shrink-0">{{ String(ch.chapter_number).padStart(2, '0') }}</span>
                    <span class="truncate font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">{{ ch.title }}</span>
                  </div>
                  <span class="text-[11px] text-neutral-400 flex-shrink-0 ml-4">{{ formatDate(ch.created_at) }}</span>
                </div>

                <p v-if="!sortedChapters.length" class="text-sm text-neutral-400 text-center py-12">
                  No chapters have been released yet.
                </p>
              </div>
            </section>

            <!-- Recommendations -->
            <NovelRecommendations :exclude-novel-id="novel.id" />
          </div>

          <!-- Sidebar -->
          <aside class="space-y-6">
            <div class="sticky top-20">
              <h2 class="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-4">Details</h2>

              <dl class="space-y-3 text-sm">
                <div class="flex justify-between">
                  <dt class="text-neutral-500">Type</dt>
                  <dd class="font-medium text-neutral-800 dark:text-neutral-200">{{ novel.type || 'Light Novel' }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-neutral-500">Status</dt>
                  <dd class="font-medium text-neutral-800 dark:text-neutral-200">{{ novel.status || 'Ongoing' }}</dd>
                </div>
                <div v-if="novel.serialization" class="flex justify-between">
                  <dt class="text-neutral-500">Serialization</dt>
                  <dd class="font-medium text-neutral-800 dark:text-neutral-200">{{ novel.serialization }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-neutral-500">Updated</dt>
                  <dd class="font-medium text-neutral-800 dark:text-neutral-200">{{ formatDate(novel.updated_at) }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-neutral-500">Views</dt>
                  <dd class="font-medium text-neutral-800 dark:text-neutral-200">{{ (novel.views || 0).toLocaleString() }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-neutral-500">Followers</dt>
                  <dd class="font-medium text-neutral-800 dark:text-neutral-200">{{ (novel.follower_count || 0).toLocaleString() }}</dd>
                </div>
              </dl>

              <div v-if="novel.alternative_titles && novel.alternative_titles.length" class="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">Alternative Titles</h3>
                <ul class="space-y-1">
                  <li v-for="title in novel.alternative_titles" :key="title" class="text-xs text-neutral-500 leading-snug">{{ title }}</li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </template>

    <!-- Not found -->
    <div v-else-if="loaded" class="text-center py-32">
      <p class="text-neutral-500">Novel not found.</p>
      <router-link to="/" class="mt-4 text-sm underline underline-offset-2 inline-block">Go Home</router-link>
    </div>

    <!-- ───── Footer ───── -->
    <SiteFooter />
  </div>
</template>
