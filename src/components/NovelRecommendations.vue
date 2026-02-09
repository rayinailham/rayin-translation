
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
  <div class="mt-20 pt-12 border-t border-gray-100 dark:border-gray-800">
      <h3 class="text-xl font-bold tracking-tight mb-8 text-center">You Might Also Like</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div 
            v-for="novel in novels" 
            :key="novel.id"
            @click="goNovel(novel.slug)"
            class="group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/20 p-4 rounded-xl transition"
          >
              <div class="aspect-[2/3] bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden mb-4 shadow-sm group-hover:shadow-md transition">
                  <img :src="novel.image_url" class="w-full h-full object-cover transform group-hover:scale-105 transition duration-500" />
              </div>
              <h4 class="font-bold text-base line-clamp-2 mb-1 group-hover:underline decoration-1 underline-offset-4">{{ novel.title }}</h4>
              <p v-if="novel.romaji_title" class="text-[10px] text-gray-400 italic mb-1 truncate">{{ novel.romaji_title }}</p>
              <p class="text-xs text-gray-500">{{ novel.author_romaji || novel.author }}</p>
          </div>
      </div>
  </div>
</template>
