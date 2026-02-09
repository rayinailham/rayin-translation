
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import NovelView from '../views/NovelView.vue'
import ChapterView from '../views/ChapterView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/novel/:slug',
      name: 'novel',
      component: NovelView
    },
    {
      path: '/novel/:slug/:chapter',
      name: 'chapter',
      component: ChapterView
    }
  ]
})

export default router
