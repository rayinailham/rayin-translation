<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

import { supabase } from '../supabase'
import SiteFooter from '../components/SiteFooter.vue'
import GlobalHeader from '../components/GlobalHeader.vue'
import { useAuthStore } from '../stores/auth'
import { logger } from '../utils/logger'

const router = useRouter()
const auth = useAuthStore()

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

// ── Preview ──
const showPreview = ref(false)
const previewNovel = ref(null)

function openPreview(novel) {
  previewNovel.value = novel
  showPreview.value = true
}

// ── Data Fetching ──
onMounted(async () => {
  logger.fetch('Home Data Start')
  
  try {
    // Featured novels for carousel
    const { data: featured, error: featuredError } = await supabase
      .from('novels')
      .select('*')
      .not('banner_url', 'is', null)
      .limit(10)

    if (featuredError) throw featuredError
    
    if (featured?.length) {
      featuredNovels.value = featured
      resetTimer()
      logger.fetch('Featured Loaded', { count: featured.length })
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
        console.error('Error fetching featured:', err)
        logger.error('Fetch Featured Failed', err)
    }
  }

  try {
    // Latest updated novels with their chapters (published)
    let latestQuery = supabase
      .from('novels')
      .select('*, chapters(id, chapter_number, title, published_at)')
      .order('updated_at', { ascending: false })
      .limit(15)

    if (!auth.isSuperAdmin) {
        // In a real app, you'd filter the subquery for chapters published_at <= now()
        // For now, sorting by published_at DESC is the main priority
    }

    const { data: latest, error: latestError } = await latestQuery
    if (latestError) throw latestError

    if (latest) {
      latestNovels.value = latest.map(n => ({
        ...n,
        chapters: (n.chapters || [])
          .sort((a, b) => b.chapter_number - a.chapter_number)
          .slice(0, 3)
      }))
      logger.fetch('Latest Loaded', { count: latestNovels.value.length })
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
        console.error('Error fetching latest:', err)
        logger.error('Fetch Latest Failed', err)
    }
  }

  try {
    // Popular — All Time
    const { data: allTime, error: allTimeError } = await supabase
      .from('novels')
      .select('id, title, slug, image_url, author')
      .order('created_at', { ascending: true })
      .limit(10)
      
    if (allTimeError) throw allTimeError
    if (allTime) popularData.value.all = allTime

    // Popular — Weekly
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const { data: weekly, error: weeklyError } = await supabase
      .from('novels')
      .select('id, title, slug, image_url, author')
      .gte('updated_at', weekAgo)
      .order('updated_at', { ascending: false })
      .limit(10)
      
    if (weeklyError) throw weeklyError
    if (weekly) popularData.value.weekly = weekly

    // Popular — Monthly
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString()
    const { data: monthly, error: monthlyError } = await supabase
      .from('novels')
      .select('id, title, slug, image_url, author')
      .gte('updated_at', monthAgo)
      .order('updated_at', { ascending: false })
      .limit(10)
      
    if (monthlyError) throw monthlyError
    if (monthly) popularData.value.monthly = monthly
    
    logger.fetch('Popular Loaded', { 
        all: popularData.value.all.length, 
        weekly: popularData.value.weekly.length, 
        monthly: popularData.value.monthly.length 
    })

  } catch (err) {
    if (err.name !== 'AbortError') {
        console.error('Error fetching popular:', err)
        logger.error('Fetch Popular Failed', err)
    }
  }
})

onUnmounted(() => clearInterval(slideTimer))
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-black transition-colors">

    <!-- SEO: Main heading (visually hidden) -->
    <h1 class="sr-only">Rayin Translation - Read Light Novels & Web Novels in English for Free</h1>

    <!-- ───── Header ───── -->
    <GlobalHeader />

    <!-- ───── Carousel ───── -->
    <section v-if="featuredNovels.length" class="relative overflow-hidden bg-black h-[520px] sm:h-[450px] md:h-[500px]">
      <Transition name="fade" mode="out-in">
        <div :key="currentSlide" class="absolute inset-0">
          <!-- Background -->
          <div class="absolute inset-0">
            <img v-if="currentFeatured?.banner_url" :src="currentFeatured.banner_url"
              class="w-full h-full object-cover opacity-50 blur-[3px] scale-110" style="object-position: center 25%" :alt="currentFeatured?.title + ' banner'" fetchpriority="high" />
            <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black sm:bg-gradient-to-r sm:from-black/90 sm:via-black/70 sm:to-black/30" />
          </div>
 
          <!-- Content -->
          <div
            class="relative z-10 max-w-7xl mx-auto px-6 h-full flex flex-col sm:flex-row gap-6 sm:gap-10 items-center justify-center pt-8 sm:pt-0">
            <!-- Cover -->
            <div class="w-32 sm:w-40 md:w-48 flex-shrink-0 cursor-pointer shadow-2xl transform transition hover:scale-105" @click="goNovel(currentFeatured?.slug)">
              <img :src="currentFeatured?.image_url" class="w-full aspect-[2/3] object-cover rounded-lg ring-1 ring-white/10"
                :alt="currentFeatured?.title + ' cover'" width="192" height="288" />
            </div>
 
            <!-- Info -->
            <div class="flex-1 text-white text-center sm:text-left min-w-0 pb-12 sm:pb-0">
              <p class="text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-2 opacity-80">Featured Novel</p>
              <h2
                class="text-xl sm:text-2xl md:text-3xl font-black leading-tight cursor-pointer hover:text-neutral-200 transition-colors line-clamp-2 md:line-clamp-none"
                @click="goNovel(currentFeatured?.slug)">
                {{ currentFeatured?.title }}
              </h2>
              
              <!-- Genres -->
              <div class="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-4">
                <span v-for="g in parsedGenres" :key="g"
                  class="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-white/10 backdrop-blur-md border border-white/5 rounded shadow-sm">
                  {{ g }}
                </span>
              </div>
 
              <!-- Synopsis -->
              <p class="mt-4 text-xs sm:text-sm text-neutral-300 line-clamp-2 sm:line-clamp-3 leading-relaxed max-w-2xl opacity-90">
                {{ currentFeatured?.synopsis }}
              </p>
 
              <!-- Author -->
              <p class="mt-4 text-[12px] sm:text-xs text-neutral-500 font-medium tracking-wide">
                by <span class="text-neutral-300">{{ currentFeatured?.author }}</span>
              </p>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Carousel Controls (outside transition so they don't slide) -->
      <div class="absolute bottom-4 right-4 md:bottom-6 md:right-8 z-20 flex flex-col items-end gap-2">
        <div class="flex items-center gap-3">
          <span class="text-xs font-bold text-neutral-500 tracking-wider">NO. {{ currentSlide + 1 }}</span>
          <button @click.stop="prevSlide" class="p-1.5 rounded-full hover:bg-white/10 text-white transition" aria-label="Previous slide">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button @click.stop="nextSlide" class="p-1.5 rounded-full hover:bg-white/10 text-white transition" aria-label="Next slide">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
        <div class="flex gap-1.5">
          <button v-for="(_, i) in featuredNovels" :key="i" @click="currentSlide = i; resetTimer()"
            class="w-1.5 h-1.5 rounded-full transition-all"
            :class="i === currentSlide ? 'bg-white w-4' : 'bg-white/30 hover:bg-white/50'"
            :aria-label="'Go to slide ' + (i + 1)"
            :aria-current="i === currentSlide ? 'true' : undefined" />
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
                  @click.stop="openPreview(novel)" :alt="novel.title + ' cover'" loading="lazy" width="96" height="128" />
                <div class="absolute inset-0 ring-1 ring-inset ring-black/10 dark:ring-white/10 rounded-xl pointer-events-none" />
              </div>
              <!-- Info -->
              <div class="flex-1 min-w-0 flex flex-col justify-center">
                <h3 class="text-[17px] font-bold truncate cursor-pointer hover:text-black dark:hover:text-white transition-colors"
                  @click="goNovel(novel.slug)">
                  {{ novel.title }}
                </h3>
                <p class="text-[13px] font-medium text-neutral-400 mt-0.5 tracking-wide">{{ novel.author }}</p>

                <div class="mt-3 space-y-1.5">
                  <div v-for="ch in novel.chapters" :key="ch.id"
                    class="flex items-center justify-between gap-3 text-xs">
                    <span
                      class="truncate text-neutral-500 dark:text-neutral-400 cursor-pointer hover:text-black dark:hover:text-white transition-colors font-medium"
                      @click="goChapter(novel.slug, ch.chapter_number)">
                      Ch.{{ ch.chapter_number }}<span class="mx-1.5 opacity-30 text-neutral-400">–</span>{{ ch.title }}
                    </span>
                    <span class="text-neutral-400 dark:text-neutral-600 flex-shrink-0 text-[12px] font-mono">
                      {{ timeAgo(ch.published_at) }}
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
              <img :src="novel.image_url" class="w-9 h-[52px] object-cover rounded flex-shrink-0" :alt="novel.title + ' cover'" loading="lazy" width="36" height="52" />
              <div class="flex-1 min-w-0">
                <h4 class="text-sm font-medium truncate">{{ novel.title }}</h4>
                <p class="text-[13px] text-neutral-400 truncate">{{ novel.author }}</p>
              </div>
            </div>

            <p v-if="!currentPopular.length" class="text-xs text-neutral-400 text-center py-8">No data yet.</p>
          </div>
        </aside>
      </div>
    </div>

    <!-- ───── Footer ───── -->
    <SiteFooter />

    <!-- ───── Image Preview Overlay ───── -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showPreview && previewNovel" 
          @click="showPreview = false"
          class="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 sm:p-10 cursor-zoom-out">
          
          <!-- Close button -->
          <button 
            @click="showPreview = false"
            class="absolute top-6 right-6 text-white/50 hover:text-white transition-colors p-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          <Transition
            appear
            enter-active-class="transition duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)"
            enter-from-class="opacity-0 scale-95 translate-y-4"
            enter-to-class="opacity-100 scale-100 translate-y-0"
          >
            <div class="relative max-w-full max-h-full">
              <img 
                :src="previewNovel.image_url" 
                class="max-w-full max-h-[85vh] h-auto w-auto rounded-lg shadow-2xl object-contain ring-1 ring-white/10" 
                :alt="previewNovel.title" 
                @click.stop
              />
              <div class="mt-4 text-center">
                <h3 class="text-white font-medium text-lg">{{ previewNovel.title }}</h3>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
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
