
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase'
import { logger } from '../utils/logger'

export const useAuthStore = defineStore('auth', () => {
    const user = ref(null)
    const userProfile = ref(null)
    const isSuperAdmin = ref(false)
    const isReady = ref(false)
    let listenerRegistered = false
  
    const checkUser = async () => {
      logger.system('Auth Check Start')
      try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            user.value = session.user
            logger.system('Session Found', { userId: user.value.id, email: user.value.email })
            await fetchProfile(user.value.id)
          } else {
            user.value = null
            userProfile.value = null
            isSuperAdmin.value = false
            logger.system('No Session Found')
          }
      
          // Only register the listener once to prevent stacking
          if (!listenerRegistered) {
            listenerRegistered = true
            supabase.auth.onAuthStateChange(async (event, session) => {
              logger.system(`Auth State Changed: ${event}`)
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
      } catch (e) {
          logger.error('Auth Check Failed', e)
      } finally {
          isReady.value = true
      }
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
        logger.system('Profile Loaded', { role: data.role })
      } else {
          logger.warn('Profile Fetch Failed or Missing', { userId, error })
          isSuperAdmin.value = false
      }
    }
    
    const signIn = async (email, password) => {
        logger.system('Sign In Attempt', { email })
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        })
        if (error) {
            logger.error('Sign In Failed', error)
            throw error
        }
        logger.system('Sign In Success')
    }
  
    const signUp = async (email, password, username) => {
        logger.system('Sign Up Attempt', { email, username })
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username
                }
            }
        })
        if (error) {
            logger.error('Sign Up Failed', error)
            throw error
        }
        logger.system('Sign Up Triggered (Check Email)')
    }
  
    const signOut = async () => {
        logger.system('Sign Out Triggered')
        await supabase.auth.signOut()
        user.value = null
        userProfile.value = null
        isSuperAdmin.value = false
        logger.system('Sign Out Complete')
    }
  
    return { 
      user, 
      userProfile, 
      isSuperAdmin, 
      isReady,
      checkUser, 
      signIn, 
      signUp, 
      signOut 
    }
  })
