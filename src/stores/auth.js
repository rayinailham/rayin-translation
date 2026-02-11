
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
  
    const checkUser = () => {
      if (listenerRegistered) return
      
      logger.system('Auth Check Initializing')
      listenerRegistered = true
      
      // 1. Setup listener immediately to catch any state changes during init
      supabase.auth.onAuthStateChange(async (event, session) => {
          logger.system(`Auth State Changed: ${event}`)
          
          if (session?.user) {
              // Avoid duplicate profile fetches if user is already set and consistent
              if (user.value?.id !== session.user.id) {
                  user.value = session.user
                  logger.system('Session Start', { userId: user.value.id })
                  await fetchProfile(user.value.id)
              }
          } else {
              if (user.value) {
                  logger.system('Session Ended')
              }
              user.value = null
              userProfile.value = null
              isSuperAdmin.value = false
          }
          
          // Mark as ready once we receive the first relevant event or if we are just signed out
          if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
               isReady.value = true
          }
      })

      // 2. Explicitly check session in case INITIAL_SESSION fired before listener or didn't fire
      // This serves as a fallback to ensure isReady gets set if nothing else happens
      Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Auth Session Timeout')), 1000))
      ]).then(async ({ data }) => {
          const session = data?.session
          if (session?.user && !user.value) {
              user.value = session.user
              await fetchProfile(user.value.id)
          }
          // Ensure ready logic handles this fallback
          if (!isReady.value) isReady.value = true
      }).catch(err => {
          logger.error('Auth Session Check Error', err)
          // Even on error/timeout, we must mark as ready to let the app proceed (e.g. to public pages)
          if (!isReady.value) isReady.value = true
      })
    }
  
    const fetchProfile = async (userId) => {
      // Don't refetch if we already have the profile for this user
      if (userProfile.value && userProfile.value.id === userId) return

      try {
        const { data, error } = await Promise.race([
            supabase
            .from('profiles')
            .select('role, username')
            .eq('id', userId)
            .maybeSingle(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Profile fetch timeout')), 2000))
        ])
        
        if (data) {
            userProfile.value = { ...data, id: userId }
            isSuperAdmin.value = data.role === 'superadmin'
            logger.system('Profile Loaded', { role: data.role })
        } else if (error) {
            logger.warn('Profile Fetch Error', error)
            // Do not logout user, just degrade functionality
            isSuperAdmin.value = false
        } else {
            // No profile found
             isSuperAdmin.value = false
        }
      } catch (e) {
         logger.error('Profile Exception', e)
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
        try {
            await Promise.race([
                supabase.auth.signOut(),
                new Promise((resolve) => setTimeout(resolve, 2000)) // Force resolve after 2s
            ])
        } catch (e) {
            logger.warn('Sign Out API Error/Timeout', e)
        } finally {
            // Always clear local state
            user.value = null
            userProfile.value = null
            isSuperAdmin.value = false
            logger.system('Sign Out Complete')
            // Force reload removed to allow smooth transition
            // window.location.href = '/' 
        }
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
