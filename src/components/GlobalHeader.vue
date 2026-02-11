
<script setup>
import { ref, computed, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import { useAuthStore } from '../stores/auth'
const AuthModal = defineAsyncComponent(() => import('./AuthModal.vue'))

const auth = useAuthStore()
const isAuthModalOpen = ref(false)
const isProfileDropdownOpen = ref(false)
const profileRef = ref(null)

const toggleProfileDropdown = () => {
    isProfileDropdownOpen.value = !isProfileDropdownOpen.value
}

const handleClickOutside = (event) => {
    if (profileRef.value && !profileRef.value.contains(event.target)) {
        isProfileDropdownOpen.value = false
    }
}

onMounted(() => {
    window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
    window.removeEventListener('click', handleClickOutside)
})

const openAuthModal = () => {
    isAuthModalOpen.value = true
}

const logout = async () => {
    await auth.signOut()
    // auth.signOut() already redirects to home
}

const userDisplayName = computed(() => {
    if (auth.userProfile?.username) return auth.userProfile.username
    if (auth.user?.email) return auth.user.email.split('@')[0]
    return 'User'
})

const userInitial = computed(() => {
    return (userDisplayName.value[0] || 'U').toUpperCase()
})

</script>

<template>
  <header class="sticky top-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-neutral-200/50 dark:border-neutral-800/50 transition-all duration-300" role="banner">
    <div class="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">

      <!-- Logo area -->
      <div class="flex items-center gap-4 overflow-hidden">
        <router-link to="/" class="flex items-center gap-2 group transition-all duration-300 flex-shrink-0 text-neutral-800 dark:text-neutral-200 hover:opacity-70">
            <img src="/logo.webp" alt="Rayin Translation logo" class="h-6 w-6 object-contain group-hover:scale-105 transition-transform duration-300" width="24" height="24" />
            <span class="hidden sm:inline font-bold text-sm tracking-tight">
                Rayin Translation
            </span>
        </router-link>
        
        <div class="flex items-center gap-2 min-w-0">
            <slot name="branding"></slot>
        </div>
      </div>

      <!-- Right Side -->
      <div class="flex items-center gap-3 sm:gap-5">
        
        <!-- Admin Tools -->
        <div v-if="auth.isSuperAdmin" class="hidden md:flex items-center">
            <router-link to="/admin/add-novel" class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all duration-300 text-[10px] font-bold uppercase tracking-wider border border-red-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                Add Novel
            </router-link>
        </div>

        <!-- Auth Section -->
        <div v-if="auth.user" class="relative" ref="profileRef">
            <button 
                @click="toggleProfileDropdown"
                class="flex items-center gap-2 pl-3 p-1 bg-neutral-100/50 dark:bg-neutral-900/50 rounded-full border border-neutral-200/50 dark:border-neutral-800/50 backdrop-blur-sm hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors group"
            >
                <div class="flex flex-col items-end pr-1 overflow-hidden">
                    <span class="text-[11px] font-bold text-neutral-900 dark:text-neutral-100 leading-none truncate max-w-[100px]">
                        {{ userDisplayName }}
                    </span>
                    <span class="text-[9px] font-bold uppercase tracking-widest text-neutral-400 group-hover:text-neutral-500 transition-colors">
                        Account
                    </span>
                </div>
                <div class="h-8 w-8 rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800 flex items-center justify-center text-[11px] font-bold border border-neutral-300 dark:border-neutral-700 shadow-inner group-hover:scale-105 transition-transform">
                    {{ userInitial }}
                </div>
            </button>

            <!-- Dropdown Menu -->
            <transition
                enter-active-class="transition duration-200 ease-out"
                enter-from-class="transform scale-95 opacity-0 -translate-y-2"
                enter-to-class="transform scale-100 opacity-100 translate-y-0"
                leave-active-class="transition duration-150 ease-in"
                leave-from-class="transform scale-100 opacity-100 translate-y-0"
                leave-to-class="transform scale-95 opacity-0 -translate-y-2"
            >
                <div v-if="isProfileDropdownOpen" class="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800/50 rounded-2xl shadow-xl shadow-black/10 dark:shadow-white/5 py-2 z-50 overflow-hidden backdrop-blur-xl">
                    <div class="px-4 py-2 border-b border-neutral-100 dark:border-neutral-800/50 mb-1">
                        <p class="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Signed in as</p>
                        <p class="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">{{ auth.user.email }}</p>
                    </div>
                    
                    <router-link to="/profile" class="flex items-center gap-3 px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white transition-colors" @click="isProfileDropdownOpen = false">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        Profile
                    </router-link>
                    
                    <router-link to="/settings" class="flex items-center gap-3 px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white transition-colors" @click="isProfileDropdownOpen = false">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                        Settings
                    </router-link>

                    <div class="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/50">
                        <button @click="logout" class="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                            Log Out
                        </button>
                    </div>
                </div>
            </transition>
        </div>

        <button v-else @click="openAuthModal" class="px-3.5 py-1 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold rounded-full hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-white/10 hover:-translate-y-0.5 transition-all duration-300 active:scale-95">
            Sign in
        </button>

        <!-- Search Icon -->
        <button class="p-2 rounded-full text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all duration-300 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Search">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
        </button>
      </div>
    </div>

    <AuthModal :isOpen="isAuthModalOpen" @close="isAuthModalOpen = false" />
  </header>
</template>
