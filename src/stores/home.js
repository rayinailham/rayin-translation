import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase'
import { logger } from '../utils/logger'

export const useHomeStore = defineStore('home', () => {
    // State
    const featuredNovels = ref([])
    const latestNovels = ref([])
    const popularData = ref({ 
        all: [], 
        weekly: [], 
        monthly: [] 
    })
    
    // Status
    const isReady = ref(false) // true if we have SOME data to show (cache or fresh)
    const isLoading = ref(false) // true if we are currently fetching fresh data
    const lastFetched = ref(null)
    const error = ref(null)

    // Actions
    const fetchHomeData = async (forceRefresh = false) => {
        // If we have data and it's fresh (e.g. < 5 mins old), and not forced, skip
        const isStale = !lastFetched.value || (Date.now() - lastFetched.value > 5 * 60 * 1000)
        
        if (!isStale && !forceRefresh && isReady.value) {
            logger.fetch('Home Data Cached')
            return
        }

        isLoading.value = true
        error.value = null
        logger.fetch('Home Data Fetch Start', { forceRefresh, isStale })

        try {
            await Promise.allSettled([
                fetchFeatured(),
                fetchLatest(),
                fetchPopular()
            ])
            
            lastFetched.value = Date.now()
            isReady.value = true
        } catch (err) {
            console.error('Home Data Fetch Error', err)
            error.value = err.message
            // Even if error, if we had old data, we stay ready
        } finally {
            isLoading.value = false
        }
    }

    const fetchFeatured = async () => {
        const { data, error } = await supabase
            .from('novels')
            .select('*')
            .not('banner_url', 'is', null)
            .limit(10)

        if (error) throw error
        if (data?.length) featuredNovels.value = data
    }

    const fetchLatest = async () => {
        // Simplified query logic
        const { data, error } = await supabase
            .from('novels')
            .select('*, chapters(id, chapter_number, title, published_at)')
            .order('updated_at', { ascending: false })
            .limit(15)

        if (error) throw error
        
        if (data) {
             latestNovels.value = data.map(n => ({
                ...n,
                chapters: (n.chapters || [])
                  .sort((a, b) => b.chapter_number - a.chapter_number)
                  .slice(0, 3)
            }))
        }
    }

    const fetchPopular = async () => {
        const [allTimeRes, weeklyRes, monthlyRes] = await Promise.all([
            supabase
              .from('novels')
              .select('id, title, slug, image_url, author')
              .order('created_at', { ascending: true })
              .limit(10),
              
            supabase
              .from('novels')
              .select('id, title, slug, image_url, author')
              .gte('updated_at', new Date(Date.now() - 7 * 86400000).toISOString())
              .order('updated_at', { ascending: false })
              .limit(10),
    
            supabase
              .from('novels')
              .select('id, title, slug, image_url, author')
              .gte('updated_at', new Date(Date.now() - 30 * 86400000).toISOString())
              .order('updated_at', { ascending: false })
              .limit(10)
        ])
        
        if (allTimeRes.data) popularData.value.all = allTimeRes.data
        if (weeklyRes.data) popularData.value.weekly = weeklyRes.data
        if (monthlyRes.data) popularData.value.monthly = monthlyRes.data
    }

    return {
        featuredNovels,
        latestNovels,
        popularData,
        isReady,
        isLoading,
        error,
        fetchHomeData
    }
})
