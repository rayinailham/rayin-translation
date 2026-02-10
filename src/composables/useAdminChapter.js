import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '../supabase'
import { logger } from '../utils/logger'

export function useAdminChapter() {
    const router = useRouter()
    const route = useRoute()

    const isEdit = computed(() => !!route.params.chapterId)
    const novelSlug = computed(() => route.params.slug)
    
    const novel = ref(null)
    const novelsList = ref([])
    const chaptersList = ref([])
    
    const form = ref({
        title: '',
        chapter_number: 1,
        content: '',
        published_at: new Date().toISOString()
    })

    const saving = ref(false)
    const errorMsg = ref('')
    const successMsg = ref('')

    // Clear messages automatically
    watch(successMsg, (val) => {
        if (val) setTimeout(() => { successMsg.value = '' }, 3000)
    })
    watch(errorMsg, (val) => {
        if (val) setTimeout(() => { errorMsg.value = '' }, 5000)
    })

    async function loadNovels() {
        try {
            const { data, error } = await supabase
                .from('novels')
                .select('id, title, slug, synopsis')
                .order('title')
            
            if (error) throw error
            novelsList.value = data || []
        } catch (err) {
            logger.error('Failed to load novels', err)
        }
    }

    async function fetchChapters(novelId) {
        if (!novelId) return
        try {
            const { data, error } = await supabase
                .from('chapters')
                .select('id, chapter_number, title')
                .eq('novel_id', novelId)
                .order('chapter_number', { ascending: false })

            if (error) throw error
            chaptersList.value = data || []
        } catch (err) {
            logger.error('Failed to fetch chapters', err)
        }
    }

    async function loadNovelBySlug(slug) {
        if (!slug) return
        try {
            const { data, error } = await supabase
                .from('novels')
                .select('id, title, slug, synopsis')
                .eq('slug', slug)
                .maybeSingle()

            if (error) throw error
            
            if (data) {
                novel.value = data
                await fetchChapters(data.id)
                
                // Auto-increment chapter number for new chapters
                if (!isEdit.value && chaptersList.value.length > 0) {
                    form.value.chapter_number = (chaptersList.value[0].chapter_number || 0) + 1
                }
            }
        } catch (err) {
            logger.error('Failed to load novel details', err)
            errorMsg.value = 'Failed to load novel details'
        }
    }

    async function loadChapter(chapterId) {
        if (!chapterId) return
        try {
            const { data, error } = await supabase
                .from('chapters')
                .select('*')
                .eq('id', chapterId)
                .maybeSingle()

            if (error) throw error

            if (data) {
                form.value = data
                // Ensure we have the novel loaded
                if (!novel.value || novel.value.id !== data.novel_id) {
                    const { data: n } = await supabase
                        .from('novels')
                        .select('id, title, slug, synopsis')
                        .eq('id', data.novel_id)
                        .maybeSingle()
                    
                    if (n) {
                        novel.value = n
                        await fetchChapters(n.id)
                    }
                }
            }
        } catch (err) {
            logger.error('Failed to load chapter', err)
            errorMsg.value = 'Failed to load chapter'
        }
    }

    async function save() {
        if (saving.value) return

        saving.value = true
        errorMsg.value = ''
        successMsg.value = ''

        const TIMEOUT_MS = 15000 // 15 seconds max for save
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

        try {
            // Basic Validation
            if (!novel.value?.id) throw new Error('No novel selected')
            if (!form.value.title) throw new Error('Chapter title is required')

            // 1. Session Refresh/Check (Automatic Recovery)
            let session = null
            try {
                // Try to get session from local/memory quickly (3s timeout)
                const { data } = await Promise.race([
                    supabase.auth.getSession(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
                ])
                session = data?.session
            } catch (err) {
                logger.warn('Quick session check failed/timed out, attempting forceful refresh...', err)
            }

            // If no valid session from quick check, try forceful refresh
            if (!session) {
                const { data, error: refreshError } = await supabase.auth.refreshSession()
                if (refreshError) throw new Error('Auto-refresh failed: ' + refreshError.message)
                session = data.session
            }
            
            if (!session) throw new Error('Unable to establish valid session. Please reload manually.')

            const payload = {
                title: form.value.title.trim(),
                chapter_number: Number(form.value.chapter_number) || 1,
                content: form.value.content || '',
                published_at: form.value.published_at ? new Date(form.value.published_at).toISOString() : new Date().toISOString(),
                novel_id: novel.value.id,
                updated_at: new Date().toISOString()
            }

            let result
            
            const options = { abortSignal: controller.signal }

            if (isEdit.value) {
                // Update
                result = await supabase
                    .from('chapters')
                    .update(payload)
                    .eq('id', route.params.chapterId)
                    .select()
                    .single()
                    .abortSignal(controller.signal)
            } else {
                // Create
                result = await supabase
                    .from('chapters')
                    .insert(payload)
                    .select()
                    .single()
                    .abortSignal(controller.signal)
            }

            if (result.error) throw result.error

            successMsg.value = 'Chapter saved successfully'
            logger.info('Chapter saved', result.data.id)

            // If creating, redirect to edit mode
            if (!isEdit.value && result.data) {
                await router.replace({ 
                    name: 'edit-chapter', 
                    params: { slug: novel.value.slug, chapterId: result.data.id } 
                })
                form.value = result.data
            }

            // Refresh chapter list
            await fetchChapters(novel.value.id)

        } catch (err) {
            console.error('Save failed:', err)
            
            if (err.name === 'AbortError') {
                 errorMsg.value = 'Save request timed out. Please check your connection and try again.'
            } else {
                 errorMsg.value = err.message || 'Failed to save chapter'
            }
            logger.error('Save failed', err)
        } finally {
            clearTimeout(timeoutId)
            saving.value = false
        }
    }

    async function deleteChapter() {
        if (!isEdit.value) return
        if (!confirm('Are you sure you want to delete this chapter? This cannot be undone.')) return

        try {
            const { error } = await supabase
                .from('chapters')
                .delete()
                .eq('id', route.params.chapterId)

            if (error) throw error

            logger.info('Chapter deleted', route.params.chapterId)
            router.push({ name: 'novel', params: { slug: novel.value.slug } })
            
        } catch (err) {
            alert(err.message)
            logger.error('Delete failed', err)
        }
    }

    // Navigation Helpers
    async function handleNovelChange(event, loadPresetsCallback) {
        const selectedId = event.target.value
        const selected = novelsList.value.find(n => n.id === selectedId)
        
        if (selected) {
            novel.value = selected
            await fetchChapters(selected.id)
            if (loadPresetsCallback) await loadPresetsCallback()

            // Go to latest chapter or new
            if (chaptersList.value.length > 0) {
                 const latest = chaptersList.value[0]
                 router.push({ name: 'edit-chapter', params: { slug: selected.slug, chapterId: latest.id } })
            } else {
                 router.push({ name: 'add-chapter', params: { slug: selected.slug } })
            }
        }
    }

    function handleChapterChange(event) {
        const val = event.target.value
        if (val === '__new__') {
            router.push({ name: 'add-chapter', params: { slug: novel.value.slug } })
        } else {
            router.push({ name: 'edit-chapter', params: { slug: novel.value.slug, chapterId: val } })
        }
    }

    return {
        isEdit,
        novelSlug,
        novel,
        novelsList,
        chaptersList,
        form,
        saving,
        errorMsg,
        successMsg,
        loadNovels,
        loadNovelBySlug,
        loadChapter,
        fetchChapters,
        save,
        deleteChapter,
        handleNovelChange,
        handleChapterChange
    }
}
