import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '../supabase'

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

    watch(successMsg, (val) => {
        if (val) setTimeout(() => { successMsg.value = '' }, 3000)
    })

    watch(errorMsg, (val) => {
        if (val) setTimeout(() => { errorMsg.value = '' }, 5000)
    })

    async function loadNovels() {
        const { data } = await supabase.from('novels').select('id, title, slug, synopsis').order('title')
        novelsList.value = data || []
    }

    async function fetchChapters(novelId) {
        const { data } = await supabase.from('chapters')
            .select('id, chapter_number, title')
            .eq('novel_id', novelId)
            .order('chapter_number', { ascending: false })
        chaptersList.value = data || []
    }

    async function loadNovelBySlug(slug) {
        const { data } = await supabase.from('novels').select('id, title, slug, synopsis').eq('slug', slug).maybeSingle()
        if (data) {
            novel.value = data
            await fetchChapters(data.id)
            
            // Predict next chapter number from already-fetched chaptersList (sorted DESC)
            if (!isEdit.value && chaptersList.value.length > 0) {
                form.value.chapter_number = chaptersList.value[0].chapter_number + 1
            }
        }
    }

    async function loadChapter(chapterId) {
        const { data } = await supabase.from('chapters').select('*').eq('id', chapterId).maybeSingle()
        if (data) {
            form.value = data
            // Load novel info if not present
            if (!novel.value || novel.value.id !== data.novel_id) {
                const { data: n } = await supabase.from('novels').select('id, title, slug, synopsis').eq('id', data.novel_id).maybeSingle()
                novel.value = n
                if (n) await fetchChapters(n.id)
            }
        }
    }

    async function save() {
        saving.value = true
        errorMsg.value = ''
        
        try {
            if (!novel.value || !novel.value.id) {
                throw new Error('Please select a novel first.')
            }

            // Refresh auth session in case token expired during long translation
            const { error: refreshError } = await supabase.auth.refreshSession()
            if (refreshError) {
                console.warn('Session refresh warning:', refreshError.message)
            }

            // Ensure types are correct to prevent 400 errors
            const payload = {
                title: form.value.title.trim(),
                chapter_number: parseInt(form.value.chapter_number) || 1,
                content: form.value.content,
                // If it's a new chapter or if the user cleared the date, default to 'Now' for immediate release
                published_at: (form.value.published_at ? new Date(form.value.published_at).toISOString() : new Date().toISOString()),
                novel_id: novel.value.id,
                updated_at: new Date().toISOString()
            }

            if (!payload.title) throw new Error('Chapter title is required.')

            // If new chapter, insert and get ID to switch to edit mode
            if (isEdit.value) {
                 const { error } = await supabase.from('chapters').update(payload).eq('id', route.params.chapterId)
                 if (error) throw error
            } else {
                 const { data: newCh, error } = await supabase.from('chapters').insert(payload).select().single()
                 if (error) throw error
                 // Update URL without reloading page completely
                 await router.replace({ name: 'edit-chapter', params: { chapterId: newCh.id } })
            }

            successMsg.value = 'Chapter saved!'

        } catch (err) {
            console.error('Save error:', err)
            errorMsg.value = err.message || 'Failed to save chapter'
        } finally {
            saving.value = false
        }
    }

    async function deleteChapter() {
        if (!confirm('Delete this chapter permanently?')) return
        const { error } = await supabase.from('chapters').delete().eq('id', route.params.chapterId)
        if (error) alert(error.message)
        else router.push({ name: 'novel', params: { slug: novel.value.slug } })
    }

    async function handleNovelChange(event, loadPresetsCallback) {
        const selectedId = event.target.value
        const selected = novelsList.value.find(n => n.id === selectedId)
        if (selected) {
            novel.value = selected
            await fetchChapters(selected.id)
            if (loadPresetsCallback) await loadPresetsCallback() // Callback to refresh presets
            
            // Find latest chapter to edit, or go to add new if none
            if (chaptersList.value.length > 0) {
                const latest = chaptersList.value[0] // Sorted desc
                router.push({ name: 'edit-chapter', params: { chapterId: latest.id } })
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
            router.push({ name: 'edit-chapter', params: { chapterId: val } })
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
