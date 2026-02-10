
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const userProfile = ref(null)
  const isSuperAdmin = ref(false)

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      user.value = session.user
      await fetchProfile(user.value.id)
    } else {
      user.value = null
      userProfile.value = null
      isSuperAdmin.value = false
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        user.value = session.user
        await fetchProfile(user.value.id)
      } else {
        user.value = null
        userProfile.value = null
        isSuperAdmin.value = false
      }
    })
  }

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, username')
      .eq('id', userId)
      .maybeSingle()
    
    if (data) {
      userProfile.value = data
      isSuperAdmin.value = data.role === 'superadmin'
    } else {
        // If profile doesn't exist yet (race condition with trigger), retry or default
        // For simplicity, we assume normal user if fetch fails
        isSuperAdmin.value = false
        // Try again just in case (optional, but good for robustness)
    }
  }
  
  const signIn = async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({
          email,
          password
      })
      if (error) throw error
  }

  const signUp = async (email, password, username) => {
      const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
              data: {
                  username
              }
          }
      })
      if (error) throw error
  }

  const signOut = async () => {
      await supabase.auth.signOut()
      user.value = null
      userProfile.value = null
      isSuperAdmin.value = false
  }

  return { 
    user, 
    userProfile, 
    isSuperAdmin, 
    checkUser, 
    signIn, 
    signUp, 
    signOut 
  }
})
