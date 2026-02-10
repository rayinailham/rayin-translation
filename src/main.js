
import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { logger } from './utils/logger'

import { createPinia } from 'pinia'

const app = createApp(App)
const pinia = createPinia()

app.config.errorHandler = (err, instance, info) => {
    logger.error('Global Vue Error', { message: err.message, stack: err.stack, info })
    console.error('Global Vue Error:', err)
}

window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled Promise Rejection', { reason: event.reason })
})

app.use(router).use(pinia).mount('#app')
