
<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabase'
import { useAuthStore } from '../stores/auth'
import GlobalHeader from '../components/GlobalHeader.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const isEdit = computed(() => !!route.params.slug)
const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')

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
  alternative_titles: '' // comma separated
})

onMounted(async () => {
  // Check auth
  if (!auth.isSuperAdmin) {
    if (auth.user) {
        // Logged in but not admin
        router.push('/')
    } else {
        // Wait for checkUser? Or assume redirect if protected route
    }
    // We'll rely on route guard or this simple check
  }

  if (isEdit.value) {
    loading.value = true
    const { data, error } = await supabase
      .from('novels')
      .select('*')
      .eq('slug', route.params.slug)
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
})

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

    // Auto-generate slug if empty (simple version)
    if (!payload.slug) {
        payload.slug = payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    }

    let error = null
    if (isEdit.value) {
      const { error: err } = await supabase
        .from('novels')
        .update(payload)
        .eq('id', form.value.id) // Use ID for update
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
    if (!confirm('Are you sure you want to delete this novel? This cannot be undone.')) return
    
    const { error } = await supabase.from('novels').delete().eq('id', form.value.id)
    if (error) {
        alert(error.message)
    } else {
        router.push('/')
    }
}
</script>

<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white pb-20">
    <GlobalHeader />

    <div class="max-w-3xl mx-auto px-4 py-10">
      <h1 class="text-2xl font-bold mb-8">{{ isEdit ? 'Edit Novel' : 'Add New Novel' }}</h1>

      <form @submit.prevent="save" class="space-y-6">
        
        <!-- Titles -->
        <div class="space-y-4 p-6 bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800">
            <h2 class="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-4">Titles</h2>
            <div class="grid gap-4">
                <div>
                    <label class="block text-sm font-medium mb-1">Main Title (English)</label>
                    <input v-model="form.title" required class="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded border border-transparent focus:border-black dark:focus:border-white outline-none transition" />
                </div>
                 <div>
                    <label class="block text-sm font-medium mb-1">Alternative Titles (comma separated)</label>
                    <input v-model="form.alternative_titles" class="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded border border-transparent focus:border-black dark:focus:border-white outline-none transition" />
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Slug (URL path)</label>
                    <input v-model="form.slug" :disabled="isEdit" class="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded border border-transparent focus:border-black dark:focus:border-white outline-none transition disabled:opacity-50" />
                </div>
            </div>
        </div>

        <!-- Metadata -->
        <div class="space-y-4 p-6 bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800">
             <h2 class="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-4">Metadata</h2>
             <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-1">Author</label>
                    <input v-model="form.author" class="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded border border-transparent focus:border-black dark:focus:border-white outline-none transition" />
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Status</label>
                    <select v-model="form.status" class="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded border border-transparent focus:border-black dark:focus:border-white outline-none transition">
                        <option>Ongoing</option>
                        <option>Completed</option>
                        <option>Hiatus</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Type</label>
                    <select v-model="form.type" class="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded border border-transparent focus:border-black dark:focus:border-white outline-none transition">
                        <option>Light Novel</option>
                        <option>Web Novel</option>
                    </select>
                </div>
             </div>
             <div>
                <label class="block text-sm font-medium mb-1">Genres (comma separated)</label>
                <input v-model="form.genres" class="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded border border-transparent focus:border-black dark:focus:border-white outline-none transition" placeholder="Fantasy, Romance, Isekai" />
            </div>
            <div>
                <label class="block text-sm font-medium mb-1">Tags (comma separated)</label>
                <input v-model="form.tags" class="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded border border-transparent focus:border-black dark:focus:border-white outline-none transition" />
            </div>
        </div>

        <!-- Media -->
        <div class="space-y-4 p-6 bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800">
             <h2 class="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-4">Media</h2>
             <div>
                <label class="block text-sm font-medium mb-1">Cover Image URL</label>
                <input v-model="form.image_url" class="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded border border-transparent focus:border-black dark:focus:border-white outline-none transition" />
            </div>
            <div>
                <label class="block text-sm font-medium mb-1">Banner Image URL</label>
                <input v-model="form.banner_url" class="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded border border-transparent focus:border-black dark:focus:border-white outline-none transition" />
            </div>
        </div>

        <!-- Synopsis -->
        <div class="space-y-4 p-6 bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800">
             <h2 class="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-4">Synopsis</h2>
             <textarea v-model="form.synopsis" rows="6" class="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded border border-transparent focus:border-black dark:focus:border-white outline-none transition"></textarea>
        </div>

        <p v-if="errorMsg" class="text-red-500 text-sm">{{ errorMsg }}</p>

        <div class="flex gap-4">
            <button type="submit" :disabled="saving" class="px-8 py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-lg hover:opacity-90 transition disabled:opacity-50">
                {{ saving ? 'Saving...' : 'Save Novel' }}
            </button>
             <button v-if="isEdit" type="button" @click="deleteNovel" class="px-8 py-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition">
                Delete
            </button>
        </div>

      </form>
    </div>
  </div>
</template>
