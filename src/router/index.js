
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import NovelView from '../views/NovelView.vue'
import ChapterView from '../views/ChapterView.vue'
import AdminNovelView from '../views/AdminNovelView.vue'
import AdminChapterView from '../views/AdminChapterView.vue'

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
    },
    // Admin Routes
    {
        path: '/admin/add-novel',
        name: 'add-novel',
        component: AdminNovelView
    },
    {
        path: '/admin/edit-novel/:slug',
        name: 'edit-novel',
        component: AdminNovelView
    },
    {
        path: '/admin/add-chapter/:slug',
        name: 'add-chapter',
        component: AdminChapterView
    },
    {
        path: '/admin/edit-chapter/:chapterId',
        name: 'edit-chapter',
        component: AdminChapterView
    }
  ]
})

export default router
