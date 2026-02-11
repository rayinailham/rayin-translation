import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase'
import { logger } from '../utils/logger'

export const useNovelStore = defineStore('novel', () => {
    // State: Map of slug -> novelData
    const novels = ref(new Map())
    // Map of "slug/chapterNumber" -> chapterData (content)
    const chapterContent = ref(new Map())
    const isLoading = ref(false)
    const prefetchedSlugs = new Set()
    const prefetchedChapters = new Set()

    // Actions
    const prefetchNovel = async (slug) => {
        if (!slug) return
        if (prefetchedSlugs.has(slug)) return

        const cached = novels.value.get(slug)
        if (!cached || cached.isPartial || (Date.now() - cached.fetchedAt > 5 * 60 * 1000)) {
            prefetchedSlugs.add(slug)
            logger.fetch('Prefetching Novel', { slug })
            
            fetchNovel(slug).finally(() => {
                setTimeout(() => prefetchedSlugs.delete(slug), 10000)
            })
        }
    }

    const prefetchChapter = async (slug, chapterNumber) => {
        if (!slug || !chapterNumber) return
        const key = `${slug}/${chapterNumber}`
        if (prefetchedChapters.has(key)) return

        const cached = chapterContent.value.get(key)
        if (!cached || (Date.now() - cached.fetchedAt > 10 * 60 * 1000)) {
            prefetchedChapters.add(key)
            logger.fetch('Prefetching Chapter', { slug, chapterNumber })

            fetchChapter(slug, chapterNumber).finally(() => {
                setTimeout(() => prefetchedChapters.delete(key), 10000)
            })
        }
    }

    const fetchNovel = async (slug) => {
        // [Existing fetchNovel logic...]
        const cached = novels.value.get(slug)
        
        if (cached) {
            const isPartial = cached.isPartial
            const isStale = (Date.now() - cached.fetchedAt > 5 * 60 * 1000)
            
            if (!isPartial && !isStale) {
                logger.fetch('Novel Data Fully Cached', { slug })
                return cached
            }
            logger.fetch('Novel Data Cached (Stale/Partial) - Background Refresh', { slug, isPartial })
        } else {
            isLoading.value = true
        }

        logger.fetch('Novel Fetch Start', { slug })

        try {
            const { data: novelData, error: novelError } = await supabase
                .from('novels')
                .select('*')
                .eq('slug', slug)
                .maybeSingle()

            if (novelError) throw novelError
            if (!novelData) return null

            const { data: chapterData, error: chapterError } = await supabase
                .from('chapters')
                .select('id, chapter_number, title, published_at, views')
                .eq('novel_id', novelData.id)
                .order('chapter_number', { ascending: true })

            if (chapterError) throw chapterError

            const result = {
                ...novelData,
                chapters: chapterData || [],
                fetchedAt: Date.now(),
                isPartial: false
            }

            novels.value.set(slug, result)
            return result

        } catch (err) {
            console.error('Novel Fetch Error', err)
            return cached || null
        } finally {
            isLoading.value = false
        }
    }

    const fetchChapter = async (slug, chapterNumber) => {
        const key = `${slug}/${chapterNumber}`
        const cached = chapterContent.value.get(key)
        
        // 1. Return cached if valid
        const isStale = !cached || (Date.now() - cached.fetchedAt > 10 * 60 * 1000)
        if (!isStale) {
            logger.fetch('Chapter Cached', { key })
            return cached
        }

        // 2. Fetch logic
        // We ensure we have the novel info first (for ID)
        // We can get it from cache or fetch it
        let novelData = novels.value.get(slug)
        if (!novelData || novelData.isPartial) {
            // Need to ensure we have novel ID. Partial data usually has ID.
            // If not in cache at all, we must fetch novel first.
            if (!novelData) {
                novelData = await fetchNovel(slug)
                if (!novelData) return null
            }
        }

        try {
            const { data, error } = await supabase
                .from('chapters')
                .select('*')
                .eq('novel_id', novelData.id)
                .eq('chapter_number', chapterNumber)
                .maybeSingle()
            
            if (error) throw error
            if (data) {
                const result = {
                    ...data,
                    fetchedAt: Date.now()
                }
                chapterContent.value.set(key, result)
                
                // Increment view count (fire & forget)
                supabase.from('chapters')
                    .update({ views: (data.views || 0) + 1 })
                    .eq('id', data.id)
                    .then(() => {}) // Silent catch

                return result
            }
            return null
        } catch (e) {
            console.error('Chapter Fetch Error', e)
            return null
        }
    }

    const getNovel = (slug) => {
        return novels.value.get(slug)
    }

    const getChapter = (slug, chapterNumber) => {
        return chapterContent.value.get(`${slug}/${chapterNumber}`)
    }

    const injectNovel = (data) => {
        if (!data || !data.slug) return
        
        const existing = novels.value.get(data.slug)
        // If we already have full data, don't overwrite with partial
        if (existing && !existing.isPartial) return 

        // Ensure chapters is array
        const chapters = Array.isArray(data.chapters) ? data.chapters : []

        novels.value.set(data.slug, {
            ...data,
            chapters,
            // If we are injecting, assume it's partial unless explicitly told otherwise
            // But usually home data is always "partial" in context of the full novel view (might miss specific fields)
            isPartial: true, 
            fetchedAt: Date.now()
        })
    }

    return {
        novels,
        chapterContent,
        isLoading,
        fetchNovel,
        prefetchNovel,
        fetchChapter,
        prefetchChapter,
        getNovel,
        getChapter,
        injectNovel
    }
})
