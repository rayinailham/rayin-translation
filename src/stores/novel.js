import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase'
import { logger } from '../utils/logger'

export const useNovelStore = defineStore('novel', () => {
    // State: Map of slug -> novelData
    const novels = ref(new Map())
    const isLoading = ref(false)

    // Actions
    const fetchNovel = async (slug) => {
        // If we have cached data for this slug, we are "ready" immediately
        // but we can still trigger a background refresh if needed
        const cached = novels.value.get(slug)
        const isStale = !cached || (Date.now() - cached.fetchedAt > 5 * 60 * 1000)

        if (!isStale) {
            logger.fetch('Novel Data Cached', { slug })
            return cached
        }

        isLoading.value = true
        logger.fetch('Novel Fetch Start', { slug })

        try {
            // Fetch Novel Details
            const { data: novelData, error: novelError } = await supabase
                .from('novels')
                .select('*')
                .eq('slug', slug)
                .maybeSingle()

            if (novelError) throw novelError
            if (!novelData) {
                // Determine if 404
                return null
            }

            // Fetch Chapters
            const { data: chapterData, error: chapterError } = await supabase
                .from('chapters')
                .select('id, chapter_number, title, published_at, views')
                .eq('novel_id', novelData.id)
                .order('chapter_number', { ascending: true })

            if (chapterError) throw chapterError

            const result = {
                ...novelData,
                chapters: chapterData || [],
                fetchedAt: Date.now()
            }

            // Update Cache
            novels.value.set(slug, result)
            return result

        } catch (err) {
            console.error('Novel Fetch Error', err)
            // If error, return cached version if available (stale data better than no data)
            return cached || null
        } finally {
            isLoading.value = false
        }
    }

    const getNovel = (slug) => {
        return novels.value.get(slug)
    }

    return {
        novels,
        isLoading,
        fetchNovel,
        getNovel
    }
})
