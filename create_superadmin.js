import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ykceernevnnsbncuhygl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrY2Vlcm5ldm5uc2JuY3VoeWdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NjQ1MTIsImV4cCI6MjA4NjE0MDUxMn0.QmZIlyBXWSz0m6Pg61xBFEKyTVE3dQxWCRj3fTVujGw'

const supabase = createClient(supabaseUrl, supabaseKey)

async function registerSuperUser() {
  const email = 'superrayin@rayin.local'
  const password = 'rayinadmin123$'
  const username = 'superrayin'

  console.log(`Registering user: ${username} (${email})...`)

  // 1. Sign Up
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username
      }
    }
  })

  if (error) {
    console.error('Error creating user:', error.message)
    // If user already exists, we can still proceed to set role if we can find the ID
    if (error.message.includes('already registered')) {
        console.log('Use existing user...')
        // We can't query auth.users with anon key, so we assume user is created or exists
    } else {
        process.exit(1)
    }
  } else if (data.user) {
    console.log('User created successfully. ID:', data.user.id)
  }
}

registerSuperUser()
