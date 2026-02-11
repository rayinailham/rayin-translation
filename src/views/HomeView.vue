<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

// import { supabase } from '../supabase' // Moved to store
import SiteFooter from '../components/SiteFooter.vue'
import GlobalHeader from '../components/GlobalHeader.vue'
import { useAuthStore } from '../stores/auth'
import { logger } from '../utils/logger'

import { useHomeStore } from '../stores/home'

const router = useRouter()
const auth = useAuthStore()
const homeStore = useHomeStore()
// Use novel store here to trigger prefetch
// Use novel store here to trigger prefetch
import { useNovelStore } from '../stores/novel'
import { getOptimizedImageUrl } from '../utils/image'
const novelStore = useNovelStore()

// ── Carousel ──
const currentSlide = ref(0)
const hasRenderedOnce = ref(false)
let slideTimer = null

const featuredNovels = computed(() => homeStore.featuredNovels)
const isLoading = computed(() => !homeStore.isReady && homeStore.isLoading)
const latestNovels = computed(() => homeStore.latestNovels)
const popularData = computed(() => homeStore.popularData)
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

// ── Popular Novels ──
const popularTab = ref('all')
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
// ── Data Fetching ──
// ── Data Fetching ──
onMounted(async () => {
  // 1. If store has data, it will be reactive immediately
  if (homeStore.featuredNovels.length > 0) {
      resetTimer()
  }

  // 2. Trigger fetch (background update if data exists)
  await homeStore.fetchHomeData()
  
  // 3. Reset timer if we just got new data and timer wasn't running
  if (homeStore.featuredNovels.length > 0) {
      resetTimer()
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
    <section class="relative overflow-hidden bg-black h-[520px] sm:h-[450px] md:h-[500px]" aria-label="Featured novels carousel">
      <!-- Skeleton placeholder while loading -->
      <div v-if="!featuredNovels.length" class="absolute inset-0 flex items-center justify-center">
        <div class="max-w-7xl mx-auto px-6 w-full flex flex-col sm:flex-row gap-6 sm:gap-10 items-center justify-center">
          <div class="w-32 sm:w-40 md:w-48 flex-shrink-0 aspect-[2/3] bg-neutral-800 rounded-lg animate-pulse" />
          <div class="flex-1 space-y-4 w-full max-w-md sm:max-w-none">
            <div class="h-3 bg-neutral-800 rounded w-24 animate-pulse" />
            <div class="h-8 bg-neutral-800 rounded w-3/4 animate-pulse" />
            <div class="flex gap-2"><div class="h-5 bg-neutral-800 rounded w-16 animate-pulse" /><div class="h-5 bg-neutral-800 rounded w-20 animate-pulse" /></div>
            <div class="h-4 bg-neutral-800 rounded w-full animate-pulse" />
            <div class="h-4 bg-neutral-800 rounded w-2/3 animate-pulse" />
          </div>
        </div>
      </div>

      <Transition name="fade" mode="out-in" :css="hasRenderedOnce" @after-enter="hasRenderedOnce = true">
        <div v-if="featuredNovels.length" :key="currentSlide" class="absolute inset-0">
          <!-- Background -->
          <div class="absolute inset-0">
            <img v-if="currentFeatured?.banner_url" 
              :srcset="`${getOptimizedImageUrl(currentFeatured.banner_url, { width: 640, quality: 60, format: 'webp', resize: 'cover' })} 640w,
                        ${getOptimizedImageUrl(currentFeatured.banner_url, { width: 1024, quality: 60, format: 'webp', resize: 'cover' })} 1024w,
                        ${getOptimizedImageUrl(currentFeatured.banner_url, { width: 1280, quality: 60, format: 'webp', resize: 'cover' })} 1280w`"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 100vw"
              :src="getOptimizedImageUrl(currentFeatured.banner_url, { width: 1280, quality: 60, format: 'webp', resize: 'cover' })"
              class="w-full h-full object-cover opacity-50 blur-[3px] scale-110" style="object-position: center 25%" :alt="currentFeatured?.title + ' banner'" fetchpriority="high" />
            <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black sm:bg-gradient-to-r sm:from-black/90 sm:via-black/70 sm:to-black/30" />
          </div>
 
          <!-- Content -->
          <div
            class="relative z-10 max-w-7xl mx-auto px-6 h-full flex flex-col sm:flex-row gap-6 sm:gap-10 items-center justify-center pt-8 sm:pt-0">
            <!-- Cover -->
            <router-link :to="{ name: 'novel', params: { slug: currentFeatured?.slug } }"
                 class="w-32 sm:w-40 md:w-48 flex-shrink-0 cursor-pointer shadow-2xl transform transition hover:scale-105 block" 
                 @mouseenter="novelStore.prefetchNovel(currentFeatured?.slug)">
              <img :srcset="`${getOptimizedImageUrl(currentFeatured.image_url, { width: 200, quality: 80, format: 'webp' })} 200w,
                             ${getOptimizedImageUrl(currentFeatured.image_url, { width: 400, quality: 80, format: 'webp' })} 400w`"
                   sizes="(max-width: 640px) 128px, 192px"
                   :src="getOptimizedImageUrl(currentFeatured.image_url, { width: 400, quality: 80, format: 'webp' })" class="w-full aspect-[2/3] object-cover rounded-lg ring-1 ring-white/10"
                :alt="currentFeatured?.title + ' cover'" width="192" height="288" loading="eager" decoding="async" />
            </router-link>
 
            <!-- Info -->
            <div class="flex-1 text-white text-center sm:text-left min-w-0 pb-12 sm:pb-0">
              <p class="text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.2em] text-neutral-300 mb-2">Featured Novel</p>
              <h2 class="text-xl sm:text-2xl md:text-3xl font-black leading-tight line-clamp-2 md:line-clamp-none">
                <router-link :to="{ name: 'novel', params: { slug: currentFeatured?.slug } }" 
                  class="hover:text-neutral-200 transition-colors block">
                  {{ currentFeatured?.title }}
                </router-link>
              </h2>
              
              <!-- Genres -->
              <div class="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-4">
                <span v-for="g in parsedGenres" :key="g"
                  class="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-white/10 backdrop-blur-md border border-white/5 rounded shadow-sm">
                  {{ g }}
                </span>
              </div>
 
              <!-- Synopsis -->
              <p class="mt-4 text-xs sm:text-sm text-neutral-300 line-clamp-2 sm:line-clamp-3 leading-relaxed max-w-2xl">
                {{ currentFeatured?.synopsis }}
              </p>
 
              <!-- Author -->
              <p class="mt-4 text-[12px] sm:text-xs text-neutral-400 font-medium tracking-wide">
                by <span class="text-neutral-200">{{ currentFeatured?.author }}</span>
              </p>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Carousel Controls (outside transition so they don't slide) -->
      <div v-if="featuredNovels.length" class="absolute bottom-4 right-4 md:bottom-6 md:right-8 z-20 flex flex-col items-end gap-2">
        <div class="flex items-center gap-3">
          <span class="text-xs font-bold text-neutral-400 tracking-wider">NO. {{ currentSlide + 1 }}</span>
          <button @click.stop="prevSlide" class="p-2 rounded-full hover:bg-white/10 text-white transition min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Previous slide">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button @click.stop="nextSlide" class="p-2 rounded-full hover:bg-white/10 text-white transition min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Next slide">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
        <div class="flex gap-2" role="tablist" aria-label="Carousel slides">
          <button v-for="(_, i) in featuredNovels" :key="i" @click="currentSlide = i; resetTimer()"
            class="rounded-full transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
            :aria-label="'Go to slide ' + (i + 1)"
            :aria-current="i === currentSlide ? 'true' : undefined"
            role="tab">
            <span class="block rounded-full transition-all" :class="i === currentSlide ? 'bg-white w-5 h-2.5' : 'bg-white/30 hover:bg-white/50 w-2.5 h-2.5'" />
          </button>
        </div>
      </div>
    </section>

    <!-- ───── Main Content ───── -->
    <div class="max-w-7xl mx-auto px-4 py-10" style="content-visibility: auto; contain-intrinsic-size: auto 800px;">
      <div class="flex flex-col lg:flex-row gap-10">

        <!-- Latest Updates -->
        <main class="flex-1 min-w-0">
          <h2 class="text-lg font-bold tracking-tight mb-6">Latest Updates</h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div v-for="novel in latestNovels" :key="novel.id"
              class="group relative flex gap-5 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-800/50 hover:border-black dark:hover:border-white transition-all duration-300 hover:shadow-xl hover:shadow-black/5">
              <!-- Cover -->
              <div class="relative w-20 h-28 md:w-24 md:h-32 flex-shrink-0 overflow-hidden rounded-xl shadow-lg"
                 @mouseenter="novelStore.prefetchNovel(novel.slug)">
                <img :srcset="`${getOptimizedImageUrl(novel.image_url, { width: 100, quality: 80, format: 'webp' })} 100w,
                               ${getOptimizedImageUrl(novel.image_url, { width: 200, quality: 80, format: 'webp' })} 200w`"
                     sizes="(max-width: 640px) 80px, 96px"
                     :src="getOptimizedImageUrl(novel.image_url, { width: 200, quality: 80, format: 'webp' })"
                  class="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-500"
                  @click.stop="openPreview(novel)" :alt="novel.title + ' cover'" loading="lazy" decoding="async" width="96" height="128" />
                <div class="absolute inset-0 ring-1 ring-inset ring-black/10 dark:ring-white/10 rounded-xl pointer-events-none" />
              </div>
              <!-- Info -->
              <div class="flex-1 min-w-0 flex flex-col justify-center">
                <h3 class="text-[17px] font-bold truncate transition-colors"
                  @mouseenter="novelStore.prefetchNovel(novel.slug)">
                  <router-link :to="{ name: 'novel', params: { slug: novel.slug } }" class="hover:text-black dark:hover:text-white block truncate">
                    {{ novel.title }}
                  </router-link>
                </h3>
                <p class="text-[13px] font-medium text-neutral-500 dark:text-neutral-400 mt-0.5 tracking-wide">{{ novel.author }}</p>

                <div class="mt-3 space-y-1.5">
                  <div v-for="ch in novel.chapters" :key="ch.id"
                    class="flex items-center justify-between gap-3 text-xs">
                    <router-link
                      :to="{ name: 'chapter', params: { slug: novel.slug, chapter: ch.chapter_number } }"
                      class="truncate text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors font-medium block"
                      @mouseenter="novelStore.prefetchChapter(novel.slug, ch.chapter_number)">
                      Ch.{{ ch.chapter_number }}<span class="mx-1.5 opacity-30 text-neutral-400">–</span>{{ ch.title }}
                    </router-link>
                    <span class="text-neutral-500 dark:text-neutral-500 flex-shrink-0 text-[12px] font-mono">
                      {{ timeAgo(ch.published_at) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Loading Skeleton (matches card layout to prevent CLS) -->
            <template v-if="isLoading">
              <div v-for="i in 4" :key="'skel-' + i"
                class="flex gap-5 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-800/50">
                <div class="w-20 h-28 md:w-24 md:h-32 flex-shrink-0 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
                <div class="flex-1 min-w-0 flex flex-col justify-center space-y-3">
                  <div class="h-5 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4 animate-pulse" />
                  <div class="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-1/3 animate-pulse" />
                  <div class="space-y-2 mt-2">
                    <div class="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-full animate-pulse" />
                    <div class="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-5/6 animate-pulse" />
                    <div class="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-4/5 animate-pulse" />
                  </div>
                </div>
              </div>
            </template>

            <p v-else-if="!latestNovels.length" class="text-sm text-neutral-400 text-center py-10">No novels found.</p>
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
              class="flex-1 px-3 py-2 text-xs font-medium rounded-md transition min-h-[44px] flex items-center justify-center"
              :class="popularTab === tab.key
                ? 'bg-white dark:bg-neutral-800 shadow-sm text-black dark:text-white'
                : 'text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'">
              {{ tab.label }}
            </button>
          </div>

          <!-- List -->
          <div class="space-y-1">
            <router-link v-for="(novel, i) in currentPopular" :key="novel.id" 
              :to="{ name: 'novel', params: { slug: novel.slug } }"
              @mouseenter="novelStore.prefetchNovel(novel.slug)"
              class="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition block">
              <span
                class="text-base font-bold text-neutral-300 dark:text-neutral-600 w-5 text-center flex-shrink-0">
                {{ i + 1 }}
              </span>
              <img :src="getOptimizedImageUrl(novel.image_url, { width: 100, quality: 80, format: 'webp' })" class="w-9 h-[52px] object-cover rounded flex-shrink-0" :alt="novel.title + ' cover'" loading="lazy" decoding="async" width="36" height="52" />
              <div class="flex-1 min-w-0">
                <h3 class="text-sm font-medium truncate">{{ novel.title }}</h3>
                <p class="text-[13px] text-neutral-500 dark:text-neutral-400 truncate">{{ novel.author }}</p>
              </div>
            </router-link>

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
                :src="getOptimizedImageUrl(previewNovel.image_url, { width: 800, quality: 90, format: 'webp' })" 
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
