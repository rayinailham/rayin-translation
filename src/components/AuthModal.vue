
<script setup>
import { ref } from 'vue'
import { supabase } from '../supabase' // Direct import for simple auth calls, or use store if preferred
import { useAuthStore } from '../stores/auth'

const props = defineProps(['isOpen'])
const emit = defineEmits(['close'])

const auth = useAuthStore()

const mode = ref('login')
const email = ref('')
const password = ref('')
const username = ref('')
const loading = ref(false)
const errorMsg = ref('')

async function handleSubmit() {
  loading.value = true
  errorMsg.value = ''
  
  try {
    if (mode.value === 'login') {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value
      })
      if (error) throw error
      // Successful login
      emit('close')
      window.location.reload() // Refresh to update UI globally (lazy way, or rely on store reactivity)
    } else {
      const { error } = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
        options: {
          data: {
            username: username.value
          }
        }
      })
      if (error) throw error
      // Successful registration
      alert('Registration successful! Please check your email for confirmation.')
      mode.value = 'login'
    }
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')"></div>

        <!-- Modal -->
        <div class="relative w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden transform transition-all p-6">
          
          <button @click="$emit('close')" class="absolute top-4 right-4 text-neutral-400 hover:text-black dark:hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          <h2 class="text-2xl font-bold text-center mb-6 text-black dark:text-white">
            {{ mode === 'login' ? 'Welcome Back' : 'Create Account' }}
          </h2>

          <div class="flex gap-4 mb-6 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
            <button @click="mode = 'login'" 
              class="flex-1 py-2 text-sm font-medium rounded-md transition-all"
              :class="mode === 'login' ? 'bg-white dark:bg-neutral-700 shadow text-black dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'"
            >
              Login
            </button>
            <button @click="mode = 'register'" 
              class="flex-1 py-2 text-sm font-medium rounded-md transition-all"
              :class="mode === 'register' ? 'bg-white dark:bg-neutral-700 shadow text-black dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'"
            >
              Register
            </button>
          </div>

          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div v-if="mode === 'register'">
              <label class="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">Username</label>
              <input v-model="username" required type="text" 
                class="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all text-sm"
                placeholder="NovelLover" />
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">Email</label>
              <input v-model="email" required type="email" 
                class="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all text-sm"
                placeholder="hello@example.com" />
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">Password</label>
              <input v-model="password" required type="password" 
                class="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all text-sm"
                placeholder="••••••••" />
            </div>

            <p v-if="errorMsg" class="text-red-500 text-xs text-center mt-2">{{ errorMsg }}</p>

            <button type="submit" :disabled="loading"
              class="w-full py-2.5 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2">
              {{ loading ? 'Processing...' : (mode === 'login' ? 'Login' : 'Sign Up') }}
            </button>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
