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
        content: ''
    })

    const loading = ref(false)
    const saving = ref(false)
    const errorMsg = ref('')

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
            
            // If simply adding new, predict next chapter number
            if (!isEdit.value) {
                const { data: lastCh } = await supabase.from('chapters')
                .select('chapter_number')
                .eq('novel_id', data.id)
                .order('chapter_number', { ascending: false })
                .limit(1)
                .maybeSingle()
                if (lastCh) form.value.chapter_number = lastCh.chapter_number + 1
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

            const payload = {
                ...form.value,
                novel_id: novel.value.id,
                updated_at: new Date()
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
            
            const slug = novel.value.slug
            if (slug) {
                 router.push({ name: 'novel', params: { slug: slug } })
            } else {
                 router.push('/')
            }

        } catch (err) {
            errorMsg.value = err.message
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
        loading,
        saving,
        errorMsg,
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
