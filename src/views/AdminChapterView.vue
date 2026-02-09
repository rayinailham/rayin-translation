
<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabase'
import { useAuthStore } from '../stores/auth'
import GlobalHeader from '../components/GlobalHeader.vue'
import { marked } from 'marked'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const isEdit = computed(() => !!route.params.chapterId)
const novelSlug = route.params.slug
const novel = ref(null)

const form = ref({
  title: '',
  chapter_number: 1,
  content: '' // Markdown content
})

const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const previewMode = ref(false)

const renderedContent = computed(() => {
    return form.value.content ? marked(form.value.content) : ''
})

onMounted(async () => {
  if (!auth.isSuperAdmin) {
     if (auth.user) router.push('/') // or Unauthorized
  }

  // Fetch Novel
  if (novelSlug) {
      const { data } = await supabase.from('novels').select('id, title, slug').eq('slug', novelSlug).single()
      novel.value = data
      
      // Auto-increment chapter number if new
      if (!isEdit.value && data) {
         const { data: lastCh } = await supabase.from('chapters')
            .select('chapter_number')
            .eq('novel_id', data.id)
            .order('chapter_number', { ascending: false })
            .limit(1)
            .single()
         if (lastCh) form.value.chapter_number = lastCh.chapter_number + 1
      }
  }

  // Fetch Chapter if Edit
  if (isEdit.value) {
      const { data } = await supabase.from('chapters').select('*').eq('id', route.params.chapterId).single()
      if (data) {
          form.value = data
          // If we didn't have novel slug from route, fetch it
          if (!novel.value) {
              const { data: n } = await supabase.from('novels').select('id, title, slug').eq('id', data.novel_id).single()
              novel.value = n
          }
      }
  }
})

async function save() {
    saving.value = true
    errorMsg.value = ''
    
    try {
        const payload = {
            ...form.value,
            novel_id: novel.value.id,
            updated_at: new Date() // if column exists, or just rely on default
        }

        let error = null
        if (isEdit.value) {
             const { error: err } = await supabase.from('chapters').update(payload).eq('id', route.params.chapterId)
             error = err
        } else {
             const { error: err } = await supabase.from('chapters').insert(payload)
             error = err
        }

        if (error) throw error
        
        // Redirect back to novel
        router.push({ name: 'novel', params: { slug: novel.value.slug } })

    } catch (err) {
        errorMsg.value = err.message
    } finally {
        saving.value = false
    }
}

async function deleteChapter() {
    if (!confirm('Delete this chapter?')) return
    const { error } = await supabase.from('chapters').delete().eq('id', route.params.chapterId)
    if (error) alert(error.message)
    else router.push({ name: 'novel', params: { slug: novel.value.slug } })
}

</script>

<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white pb-20">
    <GlobalHeader>
       <template #branding>
        <span class="text-neutral-300 dark:text-neutral-700">/</span>
        <span class="text-sm text-neutral-500 truncate">{{ novel?.title }}</span>
        <span class="text-neutral-300 dark:text-neutral-700">/</span>
        <span class="text-sm font-medium">{{ isEdit ? 'Edit Chapter' : 'New Chapter' }}</span>
      </template>
    </GlobalHeader>

    <div class="max-w-5xl mx-auto px-4 py-8">
        <div class="flex items-center justify-between mb-6">
            <h1 class="text-2xl font-bold">{{ isEdit ? `Edit Chapter ${form.chapter_number}` : 'New Chapter' }}</h1>
            <div class="flex gap-2">
                <button @click="previewMode = !previewMode" class="px-4 py-2 text-sm font-medium border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition">
                    {{ previewMode ? 'Edit Mode' : 'Preview Mode' }}
                </button>
            </div>
        </div>

        <form @submit.prevent="save" class="space-y-6">
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Meta -->
                <div class="md:col-span-1 space-y-4">
                    <div class="p-5 bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 space-y-4">
                        <div>
                            <label class="block text-sm font-medium mb-1">Chapter Number</label>
                            <input v-model="form.chapter_number" type="number" step="0.1" required class="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded border border-transparent focus:border-black dark:focus:border-white outline-none transition" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1">Title</label>
                            <input v-model="form.title" required class="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded border border-transparent focus:border-black dark:focus:border-white outline-none transition" />
                        </div>
                        
                        <div class="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                            <button type="submit" :disabled="saving" class="w-full py-2.5 bg-black dark:bg-white text-white dark:text-black font-bold rounded-lg hover:opacity-90 transition disabled:opacity-50">
                                {{ saving ? 'Saving...' : 'Publish Chapter' }}
                            </button>
                             <button v-if="isEdit" type="button" @click="deleteChapter" class="w-full mt-2 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition text-sm font-semibold">
                                Delete Chapter
                            </button>
                        </div>
                        <p v-if="errorMsg" class="text-red-500 text-xs mt-2">{{ errorMsg }}</p>
                    </div>
                </div>

                <!-- Content -->
                <div class="md:col-span-2">
                    <div class="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 min-h-[500px] flex flex-col">
                        <div class="border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 bg-neutral-50/50 dark:bg-neutral-900 flex items-center gap-2">
                            <span class="text-xs font-bold uppercase tracking-wider text-neutral-400">Content (Markdown)</span>
                        </div>
                        
                        <div class="flex-1 relative">
                            <textarea v-if="!previewMode" v-model="form.content" class="w-full h-full p-4 bg-transparent outline-none resize-none font-mono text-sm leading-relaxed" placeholder="# Chapter Title..."></textarea>
                            <div v-else class="prose dark:prose-invert max-w-none p-6" v-html="renderedContent"></div>
                        </div>
                    </div>
                </div>
            </div>

        </form>
    </div>
  </div>
</template>
