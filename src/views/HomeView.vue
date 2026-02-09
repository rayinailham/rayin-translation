<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'
import SiteFooter from '../components/SiteFooter.vue'

const router = useRouter()

// ── Carousel ──
const featuredNovels = ref([])
const currentSlide = ref(0)
let slideTimer = null

const currentFeatured = computed(() => featuredNovels.value[currentSlide.value] || null)

const parsedGenres = computed(() => {
  if (!currentFeatured.value) return []
  const g = currentFeatured.value.genres
  if (!g) return []
  if (Array.isArray(g)) return g
  try { return JSON.parse(g) } catch { return g.split(',').map(s => s.trim()) }
})

function nextSlide() {
  if (!featuredNovels.value.length) return
  currentSlide.value = (currentSlide.value + 1) % featuredNovels.value.length
  resetTimer()
}

function prevSlide() {
  if (!featuredNovels.value.length) return
  currentSlide.value = (currentSlide.value - 1 + featuredNovels.value.length) % featuredNovels.value.length
  resetTimer()
}

function resetTimer() {
  clearInterval(slideTimer)
  slideTimer = setInterval(() => {
    if (featuredNovels.value.length) {
      currentSlide.value = (currentSlide.value + 1) % featuredNovels.value.length
    }
  }, 6000)
}

// ── Latest Updates ──
const latestNovels = ref([])

// ── Popular Novels ──
const popularTab = ref('all')
const popularData = ref({ all: [], weekly: [], monthly: [] })
const currentPopular = computed(() => popularData.value[popularTab.value] || [])

// ── Time Formatting ──
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const now = new Date()
  const d = new Date(dateStr)
  const sec = Math.floor((now - d) / 1000)
  if (sec < 60) return `${Math.max(0, sec)}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Navigation ──
const goNovel = (slug) => router.push({ name: 'novel', params: { slug } })
const goChapter = (slug, num) => router.push({ name: 'chapter', params: { slug, chapter: num } })

// ── Data Fetching ──
onMounted(async () => {
  // Featured novels for carousel
  const { data: featured } = await supabase
    .from('novels')
    .select('*')
    .not('banner_url', 'is', null)
    .limit(10)

  if (featured?.length) {
    featuredNovels.value = featured
    resetTimer()
  }

  // Latest updated novels with their chapters
  const { data: latest } = await supabase
    .from('novels')
    .select('*, chapters(id, chapter_number, title, created_at)')
    .order('updated_at', { ascending: false })
    .limit(15)

  if (latest) {
    latestNovels.value = latest.map(n => ({
      ...n,
      chapters: (n.chapters || [])
        .sort((a, b) => b.chapter_number - a.chapter_number)
        .slice(0, 3)
    }))
  }

  // Popular — All Time
  const { data: allTime } = await supabase
    .from('novels')
    .select('id, title, slug, image_url, author, author_romaji')
    .order('created_at', { ascending: true })
    .limit(10)
  if (allTime) popularData.value.all = allTime

  // Popular — Weekly
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const { data: weekly } = await supabase
    .from('novels')
    .select('id, title, slug, image_url, author, author_romaji')
    .gte('updated_at', weekAgo)
    .order('updated_at', { ascending: false })
    .limit(10)
  if (weekly) popularData.value.weekly = weekly

  // Popular — Monthly
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString()
  const { data: monthly } = await supabase
    .from('novels')
    .select('id, title, slug, image_url, author, author_romaji')
    .gte('updated_at', monthAgo)
    .order('updated_at', { ascending: false })
    .limit(10)
  if (monthly) popularData.value.monthly = monthly
})

onUnmounted(() => clearInterval(slideTimer))
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-black transition-colors">

    <!-- ───── Header ───── -->
    <header class="sticky top-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur border-b border-neutral-200 dark:border-neutral-800">
      <div class="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <router-link to="/" class="flex items-center gap-2 text-lg font-bold tracking-tight hover:opacity-80 transition">
          <img src="/Logo Rayin Translation.png" alt="Rayin Translation" class="h-6 w-6 object-contain" />
          Rayin Translation
        </router-link>
        <button class="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 transition">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
        </button>
      </div>
    </header>

    <!-- ───── Carousel ───── -->
    <section v-if="featuredNovels.length" class="relative overflow-hidden bg-black h-96 md:h-[500px]">
      <Transition name="fade" mode="out-in">
        <div :key="currentSlide" class="absolute inset-0">
          <!-- Background -->
          <div class="absolute inset-0">
            <img v-if="currentFeatured?.banner_url" :src="currentFeatured.banner_url"
              class="w-full h-full object-cover opacity-40 blur-sm scale-105" style="object-position: center 25%" alt="" />
            <div class="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/50" />
          </div>

          <!-- Content -->
          <div
            class="relative z-10 max-w-7xl mx-auto px-4 h-full flex flex-col md:flex-row gap-6 md:gap-10 items-center justify-center">
            <!-- Cover -->
            <div class="w-36 md:w-48 flex-shrink-0 cursor-pointer" @click="goNovel(currentFeatured?.slug)">
              <img :src="currentFeatured?.image_url" class="w-full aspect-[2/3] object-cover rounded-lg shadow-2xl"
                alt="" />
            </div>

            <!-- Info -->
            <div class="flex-1 text-white text-center md:text-left min-w-0">
              <p class="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-2">Popular New Titles
              </p>
              <h2
                class="text-xl md:text-3xl font-bold leading-tight cursor-pointer hover:underline decoration-1 underline-offset-4"
                @click="goNovel(currentFeatured?.slug)">
                {{ currentFeatured?.title }}
              </h2>
              <div v-if="currentFeatured?.romaji_title" class="text-xs md:text-sm text-neutral-400 mt-1 italic">{{ currentFeatured.romaji_title }}</div>
              <div v-if="currentFeatured?.original_jp_title" class="text-[10px] text-neutral-500 mt-0.5">{{ currentFeatured.original_jp_title }}</div>

              <!-- Genres -->
              <div class="flex flex-wrap justify-center md:justify-start gap-2 mt-3">
                <span v-for="g in parsedGenres" :key="g"
                  class="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-white/15 rounded">
                  {{ g }}
                </span>
              </div>

              <!-- Synopsis -->
              <p class="mt-4 text-sm text-neutral-300 line-clamp-3 leading-relaxed max-w-2xl">
                {{ currentFeatured?.synopsis }}
              </p>

              <!-- Author -->
              <p class="mt-3 text-xs text-neutral-500 italic">{{ currentFeatured?.author_romaji || currentFeatured?.author }}</p>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Carousel Controls (outside transition so they don't slide) -->
      <div class="absolute bottom-4 right-4 md:bottom-6 md:right-8 z-20 flex flex-col items-end gap-2">
        <div class="flex items-center gap-3">
          <span class="text-xs font-bold text-neutral-500 tracking-wider">NO. {{ currentSlide + 1 }}</span>
          <button @click.stop="prevSlide" class="p-1.5 rounded-full hover:bg-white/10 text-white transition">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button @click.stop="nextSlide" class="p-1.5 rounded-full hover:bg-white/10 text-white transition">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
        <div class="flex gap-1.5">
          <button v-for="(_, i) in featuredNovels" :key="i" @click="currentSlide = i; resetTimer()"
            class="w-1.5 h-1.5 rounded-full transition-all"
            :class="i === currentSlide ? 'bg-white w-4' : 'bg-white/30 hover:bg-white/50'" />
        </div>
      </div>
    </section>

    <!-- ───── Main Content ───── -->
    <div class="max-w-7xl mx-auto px-4 py-10">
      <div class="flex flex-col lg:flex-row gap-10">

        <!-- Latest Updates -->
        <main class="flex-1 min-w-0">
          <h2 class="text-lg font-bold tracking-tight mb-6">Latest Updates</h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div v-for="novel in latestNovels" :key="novel.id"
              class="group relative flex gap-5 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-800/50 hover:border-black dark:hover:border-white transition-all duration-300 hover:shadow-xl hover:shadow-black/5">
              <!-- Cover -->
              <div class="relative w-20 h-28 md:w-24 md:h-32 flex-shrink-0 overflow-hidden rounded-xl shadow-lg">
                <img :src="novel.image_url"
                  class="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-500"
                  @click="goNovel(novel.slug)" alt="" />
                <div class="absolute inset-0 ring-1 ring-inset ring-black/10 dark:ring-white/10 rounded-xl" />
              </div>
              <!-- Info -->
              <div class="flex-1 min-w-0 flex flex-col justify-center">
                <h3 class="text-[15px] font-bold truncate cursor-pointer hover:text-black dark:hover:text-white transition-colors"
                  @click="goNovel(novel.slug)">
                  {{ novel.title }}
                </h3>
                <p class="text-[11px] font-medium text-neutral-400 mt-0.5 tracking-wide">{{ novel.author_romaji || novel.author }}</p>

                <div class="mt-3 space-y-1.5">
                  <div v-for="ch in novel.chapters" :key="ch.id"
                    class="flex items-center justify-between gap-3 text-xs">
                    <span
                      class="truncate text-neutral-500 dark:text-neutral-400 cursor-pointer hover:text-black dark:hover:text-white transition-colors font-medium"
                      @click="goChapter(novel.slug, ch.chapter_number)">
                      Ch.{{ ch.chapter_number }}<span class="mx-1.5 opacity-30 text-neutral-400">–</span>{{ ch.title }}
                    </span>
                    <span class="text-neutral-400 dark:text-neutral-600 flex-shrink-0 text-[10px] font-mono">
                      {{ timeAgo(ch.created_at) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <p v-if="!latestNovels.length" class="text-sm text-neutral-400 text-center py-10">No novels found.</p>
          </div>
        </main>

        <!-- ───── Popular Sidebar ───── -->
        <aside class="w-full lg:w-72 flex-shrink-0">
          <h2 class="text-lg font-bold tracking-tight mb-4">Popular</h2>

          <!-- Tabs -->
          <div class="flex gap-1 mb-5 bg-neutral-100 dark:bg-neutral-900 rounded-lg p-1">
            <button v-for="tab in [
              { key: 'all', label: 'All Time' },
              { key: 'monthly', label: 'Monthly' },
              { key: 'weekly', label: 'Weekly' }
            ]" :key="tab.key" @click="popularTab = tab.key"
              class="flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition"
              :class="popularTab === tab.key
                ? 'bg-white dark:bg-neutral-800 shadow-sm text-black dark:text-white'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'">
              {{ tab.label }}
            </button>
          </div>

          <!-- List -->
          <div class="space-y-1">
            <div v-for="(novel, i) in currentPopular" :key="novel.id" @click="goNovel(novel.slug)"
              class="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition">
              <span
                class="text-base font-bold text-neutral-200 dark:text-neutral-800 w-5 text-center flex-shrink-0">
                {{ i + 1 }}
              </span>
              <img :src="novel.image_url" class="w-9 h-[52px] object-cover rounded flex-shrink-0" alt="" />
              <div class="flex-1 min-w-0">
                <h4 class="text-sm font-medium truncate">{{ novel.title }}</h4>
                <p class="text-[11px] text-neutral-400 truncate">{{ novel.author_romaji || novel.author }}</p>
              </div>
            </div>

            <p v-if="!currentPopular.length" class="text-xs text-neutral-400 text-center py-8">No data yet.</p>
          </div>
        </aside>
      </div>
    </div>

    <!-- ───── Footer ───── -->
    <SiteFooter />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.35s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
