<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabase'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const isEdit = computed(() => !!route.params.slug)
const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const novelsList = ref([])

const form = ref({
  title: '',
  author: '',
  synopsis: '',
  image_url: '',
  banner_url: '',
  slug: '',
  status: 'Ongoing',
  type: 'Light Novel',
  genres: '',
  tags: '',
  alternative_titles: ''
})

// Keyboard shortcuts
function handleKeydown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        save()
    }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)

  if (!auth.isSuperAdmin) {
    if (auth.user) router.push('/')
  }

  // Fetch all novels for the switcher
  const { data: allNovels } = await supabase.from('novels').select('id, title, slug').order('title')
  novelsList.value = allNovels || []

  loadNovel(route.params.slug)
})

async function loadNovel(slug) {
  if (!slug) {
      resetForm()
      return
  }

  loading.value = true
  const { data } = await supabase
    .from('novels')
    .select('*')
    .eq('slug', slug)
    .single()
  
  if (data) {
    form.value = {
      ...data,
      genres: Array.isArray(data.genres) ? data.genres.join(', ') : data.genres,
      tags: Array.isArray(data.tags) ? data.tags.join(', ') : data.tags,
      alternative_titles: Array.isArray(data.alternative_titles) ? data.alternative_titles.join(', ') : ''
    }
  }
  loading.value = false
}

function resetForm() {
    form.value = {
      title: '',
      author: '',
      synopsis: '',
      image_url: '',
      banner_url: '',
      slug: '',
      status: 'Ongoing',
      type: 'Light Novel',
      genres: '',
      tags: '',
      alternative_titles: ''
    }
}

watch(() => route.params.slug, (newSlug) => {
    loadNovel(newSlug)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// Auto-dismiss errors
watch(errorMsg, (val) => {
    if (val) setTimeout(() => { errorMsg.value = '' }, 5000)
})

function switchNovel(event) {
    const slug = event.target.value
    if (slug === '__new__') {
        router.push({ name: 'add-novel' })
    } else if (slug) {
        router.push({ name: 'edit-novel', params: { slug } })
    }
}

async function save() {
  saving.value = true
  errorMsg.value = ''

  try {
    const payload = {
      ...form.value,
      genres: form.value.genres.split(',').map(s => s.trim()).filter(Boolean),
      tags: form.value.tags.split(',').map(s => s.trim()).filter(Boolean),
      alternative_titles: form.value.alternative_titles.split(',').map(s => s.trim()).filter(Boolean),
      updated_at: new Date()
    }

    if (!payload.slug) {
        payload.slug = payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    }

    let error = null
    if (isEdit.value) {
      const { error: err } = await supabase
        .from('novels')
        .update(payload)
        .eq('id', form.value.id)
      error = err
    } else {
      const { error: err } = await supabase
        .from('novels')
        .insert(payload)
      error = err
    }

    if (error) throw error
    router.push({ name: 'novel', params: { slug: payload.slug } })

  } catch (err) {
    errorMsg.value = err.message
  } finally {
    saving.value = false
  }
}

async function deleteNovel() {
    if (!confirm('Delete this novel permanently? This cannot be undone.')) return
    const { error } = await supabase.from('novels').delete().eq('id', form.value.id)
    if (error) alert(error.message)
    else router.push('/')
}
</script>

<template>
  <div class="h-screen bg-gray-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col overflow-hidden">
    <!-- Header -->
    <header class="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 sticky top-0 z-50 flex items-center justify-between px-4 shrink-0 shadow-sm">
        <div class="flex items-center gap-3 min-w-0">
            <button @click="router.back()" class="p-2 -ml-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition shrink-0" title="Back">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>

            <!-- Novel Switcher -->
            <div class="relative group">
                <select 
                    :value="isEdit ? route.params.slug : '__new__'" 
                    @change="switchNovel"
                    class="appearance-none pl-3 pr-8 py-1.5 text-sm font-bold bg-neutral-100 dark:bg-neutral-800 rounded-lg outline-none cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700 transition lg:max-w-xs truncate"
                >
                    <option value="__new__">+ New Novel</option>
                    <option v-for="n in novelsList" :key="n.slug" :value="n.slug">{{ n.title }}</option>
                </select>
                <div class="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
            </div>

            <span v-if="isEdit" class="text-[10px] px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full font-bold uppercase tracking-wider shrink-0">Edit Mode</span>
            <span v-else class="text-[10px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full font-bold uppercase tracking-wider shrink-0">New Novel</span>
        </div>

        <div class="flex items-center gap-3">
            <button v-if="isEdit" @click="deleteNovel" class="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition" title="Delete novel">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>

            <div class="h-6 w-px bg-neutral-200 dark:bg-neutral-800"></div>

            <button @click="save" :disabled="saving" class="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-black text-xs font-bold rounded-lg hover:opacity-90 transition disabled:opacity-50 shadow-sm">
                <svg v-if="saving" class="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span>{{ saving ? 'Saving Changes...' : 'Save Changes' }}</span>
                <kbd v-if="!saving" class="ml-1 px-1 py-0.5 bg-white/20 dark:bg-black/10 rounded text-[9px] font-sans opacity-80">Ctrl+S</kbd>
            </button>
        </div>
    </header>

    <!-- Scrollable Content -->
    <div class="flex-1 overflow-y-auto p-4 lg:p-8">
      <form @submit.prevent="save" class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
        
        <!-- Left Column: Primary Content -->
        <div class="lg:col-span-8 space-y-8">
            <!-- Title Section -->
            <div class="space-y-4">
                 <div>
                    <label class="section-label">Main Title</label>
                    <input v-model="form.title" required placeholder="Enter the novel title..." class="title-input" />
                 </div>
                 
                 <div>
                    <label class="section-label">Alternative Titles</label>
                    <textarea v-model="form.alternative_titles" rows="2" placeholder="Japanese title, Romaji, etc. (Comma separated)" class="text-area-field"></textarea>
                 </div>
            </div>

            <!-- Synopsis Section -->
            <div>
                <label class="section-label cursor-pointer flex items-center gap-2">
                    Synopsis
                    <span class="text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-500 font-normal">Markdown Supported</span>
                </label>
                <div class="relative group">
                    <textarea v-model="form.synopsis" rows="12" placeholder="Write a compelling synopsis..." class="text-area-field !text-base leading-relaxed"></textarea>
                    <div class="absolute bottom-3 right-3 text-xs text-neutral-400 pointer-events-none opacity-0 group-hover:opacity-100 transition">
                        {{ form.synopsis.length }} chars
                    </div>
                </div>
            </div>

             <!-- Tags & Genres -->
             <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                     <label class="section-label">Genres</label>
                     <input v-model="form.genres" placeholder="Action, Adventure, Fantasy..." class="input-field" />
                     <p class="mt-1.5 text-[10px] text-neutral-400">Comma separated lists work best.</p>
                </div>
                <div>
                     <label class="section-label">Tags</label>
                     <input v-model="form.tags" placeholder="Slow Life, OP Protagonist..." class="input-field" />
                </div>
            </div>
        </div>

        <!-- Right Column: Meta & Media -->
        <div class="lg:col-span-4 space-y-8">
            
            <!-- Publishing Info Card -->
            <div class="bg-white dark:bg-neutral-900 rounded-xl p-5 shadow-sm border border-neutral-200 dark:border-neutral-800 space-y-5">
                <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-400">Publishing Details</h3>
                
                <div class="space-y-4">
                    <div>
                        <label class="sub-label">Author</label>
                        <input v-model="form.author" placeholder="Author Name" class="input-field-sm" />
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="sub-label">Status</label>
                            <select v-model="form.status" class="select-field">
                                <option>Ongoing</option>
                                <option>Completed</option>
                                <option>Hiatus</option>
                            </select>
                        </div>
                        <div>
                            <label class="sub-label">Type</label>
                            <select v-model="form.type" class="select-field">
                                <option>Light Novel</option>
                                <option>Web Novel</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label class="sub-label">Slug</label>
                        <input v-model="form.slug" :disabled="isEdit" placeholder="auto-generated-slug" class="input-field-sm font-mono text-xs text-neutral-500" />
                    </div>
                </div>
            </div>

             <!-- Media Card -->
             <div class="space-y-6">
                <!-- Cover Image -->
                <div>
                     <label class="section-label mb-3 flex justify-between">
                        Cover Image
                        <span v-if="form.image_url" class="text-[10px] text-blue-500 font-normal cursor-pointer hover:underline" @click="window.open(form.image_url, '_blank')">View Full</span>
                     </label>
                     
                     <div class="flex gap-4">
                         <div class="w-24 h-36 bg-neutral-100 dark:bg-neutral-800 rounded-lg shrink-0 overflow-hidden border border-neutral-200 dark:border-neutral-700 relative group">
                             <img v-if="form.image_url" :src="form.image_url" class="w-full h-full object-cover" @error="$event.target.style.display='none'" />
                             <div v-else class="w-full h-full flex items-center justify-center text-neutral-300">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                             </div>
                         </div>
                         <div class="flex-1 space-y-2">
                             <input v-model="form.image_url" placeholder="https://..." class="input-field-sm text-xs" />
                             <p class="text-[10px] text-neutral-400 leading-tight">Paste a direct link to the cover image. Portrait orientation (2:3 aspect ratio) recommended.</p>
                         </div>
                     </div>
                </div>

                <!-- Banner Image -->
                <div>
                     <label class="section-label mb-3">Banner Image</label>
                     <div class="space-y-3">
                         <div class="w-full h-32 bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 relative">
                             <img v-if="form.banner_url" :src="form.banner_url" class="w-full h-full object-cover" @error="$event.target.style.display='none'" />
                             <div v-else class="w-full h-full flex items-center justify-center text-neutral-300">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                             </div>
                         </div>
                         <input v-model="form.banner_url" placeholder="https://..." class="input-field-sm text-xs" />
                     </div>
                </div>
            </div>

        </div>
      </form>
    </div>

    <!-- Error Toast -->
    <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="translate-y-2 opacity-0" enter-to-class="translate-y-0 opacity-100" leave-active-class="transition duration-150 ease-in" leave-from-class="translate-y-0 opacity-100" leave-to-class="translate-y-2 opacity-0">
        <div v-if="errorMsg" class="fixed bottom-6 right-6 bg-red-600 text-white px-4 py-3 rounded-xl shadow-xl text-sm font-medium flex items-center gap-3 z-50">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
            {{ errorMsg }}
            <button @click="errorMsg = ''" class="ml-1 opacity-70 hover:opacity-100">&times;</button>
        </div>
    </Transition>
  </div>
</template>

<style scoped>
.section-label {
    @apply block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2;
}

.sub-label {
    @apply block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5;
}

.title-input {
    @apply w-full px-0 py-2 text-3xl font-black bg-transparent border-b-2 border-neutral-100 dark:border-neutral-800 focus:border-neutral-900 dark:focus:border-neutral-100 outline-none transition placeholder:text-neutral-200 dark:placeholder:text-neutral-800 text-neutral-900 dark:text-white;
}

.input-field {
    @apply w-full px-4 py-2.5 text-sm bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 focus:border-blue-500 dark:focus:border-blue-500 outline-none transition text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400;
}

.input-field-sm {
    @apply w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-black/20 rounded-md border border-neutral-200 dark:border-neutral-700/50 focus:border-blue-500 dark:focus:border-blue-500 outline-none transition text-neutral-900 dark:text-neutral-100;
}

.text-area-field {
    @apply w-full px-4 py-3 text-sm bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 focus:border-blue-500 dark:focus:border-blue-500 outline-none transition resize-y block text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400;
}

.select-field {
    @apply w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-black/20 rounded-md border border-neutral-200 dark:border-neutral-700/50 focus:border-blue-500 dark:focus:border-blue-500 outline-none transition cursor-pointer text-neutral-900 dark:text-neutral-100;
}
</style>
