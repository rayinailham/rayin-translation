import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase'
import { logger } from '../utils/logger'

export const useNovelStore = defineStore('novel', () => {
    // State: Map of slug -> novelData
    const novels = ref(new Map())
    const isLoading = ref(false)
    const prefetchedSlugs = new Set()

    // Actions
    const prefetchNovel = async (slug) => {
        if (!slug) return
        
        // Prevent rapid duplicate prefetches (debounce/throttle logic)
        if (prefetchedSlugs.has(slug)) return

        const cached = novels.value.get(slug)
        // Only prefetch if we don't have it, or it's partial/stale
        if (!cached || cached.isPartial || (Date.now() - cached.fetchedAt > 5 * 60 * 1000)) {
            prefetchedSlugs.add(slug)
            
            // Fire and forget, don't await, and don't trigger global isLoading spinner
            // Clean up from set after delay to allow re-check later
            logger.fetch('Prefetching Novel', { slug })
            
            // We use fetchNovel but we might want a silent mode? 
            // fetchNovel already handles silent update if cached exists.
            // But if cached doesn't exist, it sets isLoading=true.
            // For hovering, we probably don't want to trigger global isLoading if we are on another page?
            // Since isLoading is global to the store, and used by NovelView.
            // If we are on HomeView, NovelView is not mounted, so its spinner won't show.
            // So it is safe to call fetchNovel.
            
            fetchNovel(slug).finally(() => {
                setTimeout(() => prefetchedSlugs.delete(slug), 10000) // Cooldown 10s
            })
        }
    }

    const fetchNovel = async (slug) => {
        // If we have cached data for this slug, we are "ready" immediately
        // but we can still trigger a background refresh if needed
        // If we have ANY cached data for this slug, return it immediately to show UI
        // We will trigger a background Fetch if it is stale or partial
        const cached = novels.value.get(slug)
        
        // Return cached immediately if exists
        if (cached) {
            // Check if we need to refresh in background
            const isPartial = cached.isPartial
            const isStale = (Date.now() - cached.fetchedAt > 5 * 60 * 1000)
            
            if (!isPartial && !isStale) {
                logger.fetch('Novel Data Fully Cached', { slug })
                return cached
            }
            
            // If partial or stale, we continue to fetch below (background update)
            // But we don't set global isLoading to true to avoid spinner if we have data
            logger.fetch('Novel Data Cached (Stale/Partial) - Background Refresh', { slug, isPartial })
        } else {
            // Only show spinner if we have NOTHING
            isLoading.value = true
        }

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
                fetchedAt: Date.now(),
                isPartial: false
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
        isLoading,
        fetchNovel,
        prefetchNovel,
        getNovel,
        injectNovel
    }
})
