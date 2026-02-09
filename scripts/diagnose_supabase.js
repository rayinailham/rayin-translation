import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const SUPABASE_URL = 'https://ykceernevnnsbncuhygl.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrY2Vlcm5ldm5uc2JuY3VoeWdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NjQ1MTIsImV4cCI6MjA4NjE0MDUxMn0.QmZIlyBXWSz0m6Pg61xBFEKyTVE3dQxWCRj3fTVujGw'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function diagnose() {
    try {
        console.log('Testing connection to Supabase...')
        
        // Check if we can reach the database by querying a public table 'profiles'
        console.log('Attempting to query public.profiles table...')
        const { data: profiles, error: tableError } = await supabase
            .from('profiles')
            .select('count', { count: 'exact', head: true })
        
        if (tableError) {
            console.error('Error accessing profiles table:', tableError.message)
            fs.writeFileSync('diagnose.log', `Error accessing profiles table: ${tableError.message}\nFull Error: ${JSON.stringify(tableError, null, 2)}`)
        } else {
            console.log('Successfully accessed profiles table. Row count:', profiles)
            fs.writeFileSync('diagnose.log', `Successfully accessed profiles table. Row count: ${JSON.stringify(profiles)}`)
        }
    } catch (err) {
        fs.writeFileSync('diagnose.log', `Script crashed: ${err.message}\n${err.stack}`)
    }
}

diagnose()
