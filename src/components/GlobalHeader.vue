
<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import AuthModal from './AuthModal.vue'

const auth = useAuthStore()
const isAuthModalOpen = ref(false)

const openAuthModal = () => {
    isAuthModalOpen.value = true
}

const logout = async () => {
    await auth.signOut()
    window.location.reload()
}

</script>

<template>
  <header class="sticky top-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur border-b border-neutral-200 dark:border-neutral-800 transition-colors">
    <div class="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">

      <!-- Logo area -->
      <div class="flex items-center gap-3 overflow-hidden">
        <router-link to="/" class="flex items-center gap-2 text-lg font-bold tracking-tight hover:opacity-80 transition flex-shrink-0">
            <img src="/Logo Rayin Translation.png" alt="Rayin Translation" class="h-6 w-6 object-contain" />
            <span class="hidden sm:inline">Rayin Translation</span>
        </router-link>
        <slot name="branding"></slot>
      </div>

      <!-- Right Side -->
      <div class="flex items-center gap-4">
        
        <!-- Admin Tools -->
        <div v-if="auth.isSuperAdmin" class="hidden md:flex items-center gap-2">
            <router-link to="/admin/add-novel" class="text-xs font-semibold uppercase tracking-wider text-red-500 hover:text-red-700 transition">
                + Add Novel
            </router-link>
        </div>

        <!-- Auth -->
        <div v-if="auth.user" class="flex items-center gap-3">
            <span class="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {{ auth.userProfile?.username || auth.user.email }}
            </span>
            <button @click="logout" class="text-xs text-neutral-500 hover:text-red-500 transition">
                Logout
            </button>
        </div>
        <button v-else @click="openAuthModal" class="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black text-xs font-bold uppercase tracking-wider rounded-full hover:opacity-80 transition">
            Login
        </button>

        <!-- Theme Toggle (existing button style) -->
        <button class="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 transition text-neutral-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
        </button>
      </div>
    </div>

    <AuthModal :isOpen="isAuthModalOpen" @close="isAuthModalOpen = false" />
  </header>
</template>
