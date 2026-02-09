
<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'

const props = defineProps(['excludeNovelId'])
import { watch } from 'vue'
const router = useRouter()
const novels = ref([])

async function fetchRecommendations() {
    // Fetch a batch of novels
    const { data } = await supabase
        .from('novels')
        .select('id, title, slug, image_url, author, author_romaji, romaji_title')
        .limit(20)
    
    if (data) {
        // Filter out current
        let candidates = data.filter(n => n.id !== props.excludeNovelId)
        // Shuffle and pick 3
        candidates.sort(() => 0.5 - Math.random())
        novels.value = candidates.slice(0, 3)
    }
}

onMounted(fetchRecommendations)
watch(() => props.excludeNovelId, fetchRecommendations)

const goNovel = (slug) => {
    router.push({ name: 'novel', params: { slug } })
}
</script>

<template>
  <div class="mt-12 pt-8 md:mt-20 md:pt-12 border-t border-neutral-100 dark:border-neutral-800">
      <h3 class="text-lg md:text-xl font-bold tracking-tight mb-6 md:mb-8 text-center text-neutral-800 dark:text-neutral-200">You Might Also Like</h3>
      
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
          <div 
            v-for="novel in novels" 
            :key="novel.id"
            @click="goNovel(novel.slug)"
            class="group cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/20 p-2 sm:p-4 rounded-xl transition"
          >
              <div class="aspect-[2/3] bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden mb-3 md:mb-4 shadow-sm group-hover:shadow-md transition">
                  <img :src="novel.image_url" class="w-full h-full object-cover transform group-hover:scale-105 transition duration-500" :alt="novel.title" />
              </div>
              <h4 class="font-bold text-sm md:text-base line-clamp-2 mb-1 group-hover:underline decoration-1 underline-offset-4 text-neutral-800 dark:text-neutral-100">{{ novel.title }}</h4>
              <p v-if="novel.romaji_title" class="text-[9px] md:text-[10px] text-neutral-400 italic mb-1 truncate">{{ novel.romaji_title }}</p>
              <p class="text-[11px] md:text-xs text-neutral-500">{{ novel.author_romaji || novel.author }}</p>
          </div>
      </div>
  </div>
</template>
