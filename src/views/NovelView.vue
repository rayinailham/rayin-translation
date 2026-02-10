<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabase'
import NovelRecommendations from '../components/NovelRecommendations.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { useAuthStore } from '../stores/auth'
import GlobalHeader from '../components/GlobalHeader.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const novel = ref(null)
const chapters = ref([])
const loaded = ref(false)
const showImagePreview = ref(false)
const synopsisExpanded = ref(false)

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

const sortAsc = ref(false)

const displayChapters = computed(() =>
  sortAsc.value ? sortedChapters.value : [...sortedChapters.value].reverse()
)

const chapterCount = computed(() => chapters.value.length)

const totalViews = computed(() => {
  return chapters.value.reduce((sum, ch) => sum + (ch.views || 0), 0)
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
  synopsisExpanded.value = false

  const { data: novelData } = await supabase
    .from('novels')
    .select('*')
    .eq('slug', slug)
    .single()

  if (novelData) {
    novel.value = novelData

    const { data: chapterData } = await supabase
      .from('chapters')
      .select('id, chapter_number, title, created_at, views')
      .eq('novel_id', novelData.id)
      .order('chapter_number', { ascending: true })

    if (chapterData) chapters.value = chapterData
  }

  loaded.value = true
  await nextTick()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(fetchData)
watch(() => route.params.slug, fetchData)

// ── Navigation ──
const goChapter = (num) =>
  router.push({ name: 'chapter', params: { slug: route.params.slug, chapter: num } })
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-neutral-950 transition-colors relative">

    <!-- ───── Banner ───── -->
    <div v-if="novel?.banner_url" class="absolute top-0 left-0 w-full h-[500px] z-0 overflow-hidden pointer-events-none fade-in">
      <img :src="novel.banner_url" class="w-full h-full object-cover opacity-60 dark:opacity-40 blur-[2px]" style="object-position: center 25%" alt="" />
      <div class="absolute inset-0 bg-gradient-to-t from-white via-white/50 to-transparent dark:from-neutral-950 dark:via-neutral-950/50 dark:to-transparent" />
    </div>

    <!-- ───── Header ───── -->
    <GlobalHeader>
      <template #branding>
        <span class="text-neutral-300 dark:text-neutral-700">/</span>
        <span class="text-sm text-neutral-500 truncate">{{ novel?.title }}</span>
      </template>
    </GlobalHeader>

    <template v-if="novel">

      <!-- ───── Novel Info ───── -->
      <div class="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 pt-12 pb-10">
        <div class="flex flex-col sm:flex-row gap-8 sm:gap-12">

          <!-- Cover -->
          <div class="w-36 sm:w-44 flex-shrink-0 mx-auto sm:mx-0">
            <div 
              @click="showImagePreview = true"
              class="relative aspect-[2/3] rounded-lg overflow-hidden shadow-md cursor-zoom-in hover:opacity-95 transition-all group"
            >
              <img :src="novel.image_url" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" :alt="novel.title" />
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              </div>
            </div>
          </div>

          <!-- Details -->
          <div class="flex-1 min-w-0 text-center sm:text-left">
            <h1 class="text-xl sm:text-2xl font-bold leading-tight text-neutral-900 dark:text-neutral-50">{{ novel.title }}</h1>

            <!-- Author -->
            <div class="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
              <span>by <span class="font-medium text-neutral-900 dark:text-neutral-100">{{ novel.author || 'Unknown' }}</span></span>
            </div>

            <!-- Inline Stats -->
            <div class="flex flex-wrap justify-center sm:justify-start items-center gap-x-4 gap-y-1 mt-4 text-xs text-neutral-500">
              <span v-if="novel.status" class="flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full" :class="novel.status === 'Ongoing' ? 'bg-green-500' : 'bg-neutral-400'" />
                {{ novel.status }}
              </span>
              <span>{{ chapterCount }} chapters</span>
              <span>{{ totalViews.toLocaleString() }} views</span>
            </div>

            <!-- Genres -->
            <div v-if="genres.length" class="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-4">
              <span v-for="g in genres" :key="g"
                class="px-2.5 py-0.5 text-[13px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-md capitalize">
                {{ g }}
              </span>
            </div>

            <!-- Tags -->
            <div v-if="tags.length" class="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-2">
              <span v-for="t in tags" :key="t"
                class="text-[12px] text-neutral-400 uppercase tracking-wider">
                #{{ t }}
              </span>
            </div>

            <!-- Start Reading -->
            <div class="mt-6 flex flex-wrap justify-center sm:justify-start gap-4">
              <button v-if="sortedChapters.length" @click="goChapter(sortedChapters[0].chapter_number)"
                class="px-6 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-semibold rounded-lg hover:opacity-90 active:scale-[0.98] transition-all">
                Start Reading
              </button>
              
              <!-- SUPERADMIN: Edit Novel -->
              <router-link v-if="auth.isSuperAdmin" :to="`/admin/edit-novel/${novel.slug}`" 
                class="px-6 py-2.5 border border-red-500 text-red-500 text-sm font-semibold rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-all">
                Edit Novel
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <!-- ───── Content ───── -->
      <div class="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 pb-20">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-16">

          <!-- Main Column -->
          <div class="lg:col-span-2 space-y-10">

            <!-- Synopsis -->
            <section>
              <h2 class="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-3">Synopsis</h2>
              <div class="relative">
                <div 
                  class="text-[17px] leading-relaxed text-neutral-600 dark:text-neutral-400 whitespace-pre-line transition-all duration-500 ease-in-out overflow-hidden relative"
                  :class="[synopsisExpanded ? 'max-h-[2000px]' : 'max-h-[160px]']"
                >
                  {{ novel.synopsis || 'No synopsis available.' }}
                  
                  <!-- Gradient overlay for "Show More" when collapsed -->
                  <div v-if="!synopsisExpanded && novel.synopsis?.length > 400" 
                    class="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-white dark:from-neutral-950 to-transparent pointer-events-none" 
                  />
                </div>
                
                <button 
                  v-if="novel.synopsis?.length > 400"
                  @click="synopsisExpanded = !synopsisExpanded"
                  class="mt-3 text-sm font-bold text-neutral-900 dark:text-white hover:opacity-70 transition-opacity flex items-center gap-1.5 focus:outline-none"
                >
                  <span>{{ synopsisExpanded ? 'Show Less' : 'Show More' }}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="transition-transform duration-300" :class="{ 'rotate-180': synopsisExpanded }">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </button>
              </div>
            </section>

            <!-- Chapters -->
            <section id="chapters">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-4">
                  <h2 class="text-sm font-semibold uppercase tracking-wider text-neutral-400">{{ chapterCount }} Chapters</h2>
                  <!-- SUPERADMIN: Add Chapter -->
                  <router-link v-if="auth.isSuperAdmin" :to="`/admin/add-chapter/${novel.slug}`"
                    class="text-xs font-bold text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded hover:bg-red-200 dark:hover:bg-red-800/40 transition">
                    + ADD CHAPTER
                  </router-link>
                </div>

                <button 
                  @click="sortAsc = !sortAsc" 
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-medium text-neutral-600 dark:text-neutral-300 transition-colors"
                >
                  <span>{{ sortAsc ? 'Oldest First' : 'Newest First' }}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="transition-transform duration-300" :class="{ 'rotate-180': sortAsc }">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </button>
              </div>

              <div class="border border-neutral-200 dark:border-neutral-800 rounded-lg divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
                <div v-for="ch in displayChapters" :key="ch.id" @click="goChapter(ch.chapter_number)"
                  class="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition text-sm group">
                  <div class="flex items-center gap-3 min-w-0">
                    <span class="text-neutral-400 font-mono text-xs w-7 flex-shrink-0">{{ String(ch.chapter_number).padStart(2, '0') }}</span>
                    <span class="truncate font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">{{ ch.title }}</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-[13px] text-neutral-400 flex-shrink-0">{{ formatDate(ch.created_at) }}</span>
                    <!-- SUPERADMIN: Edit Chapter (small icon) -->
                    <button v-if="auth.isSuperAdmin" @click.stop="router.push(`/admin/edit-chapter/${ch.id}`)" class="text-neutral-400 hover:text-red-500 p-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    </button>
                  </div>
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
                  <dd class="font-medium text-neutral-800 dark:text-neutral-200">{{ totalViews.toLocaleString() }}</dd>
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
        <div v-if="showImagePreview" 
          @click="showImagePreview = false"
          class="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 sm:p-10 cursor-zoom-out">
          
          <!-- Close button -->
          <button 
            @click="showImagePreview = false"
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
                :src="novel.image_url" 
                class="max-w-full max-h-[85vh] h-auto w-auto rounded-lg shadow-2xl object-contain ring-1 ring-white/10" 
                :alt="novel.title" 
                @click.stop
              />
              <div class="mt-4 text-center">
                <h3 class="text-white font-medium text-lg">{{ novel.title }}</h3>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
