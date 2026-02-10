
import { createRouter, createWebHistory } from 'vue-router'
import { logger } from '../utils/logger'
import HomeView from '../views/HomeView.vue'

// Lazy-load non-critical routes to reduce initial bundle size
const NovelView = () => import('../views/NovelView.vue')
const ChapterView = () => import('../views/ChapterView.vue')
const AdminNovelView = () => import('../views/AdminNovelView.vue')
const AdminChapterView = () => import('../views/AdminChapterView.vue')

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

router.beforeEach((to, from, next) => {
    logger.info(`Navigation: ${from.name || 'init'} -> ${to.name}`, { 
        to: to.fullPath, 
        params: to.params 
    })
    next()
})

router.afterEach((to) => {
    logger.info(`Navigated to: ${to.name}`)
})

router.onError((error) => {
    logger.error('Router Error', error)
})

export default router
