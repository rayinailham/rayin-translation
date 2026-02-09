
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ykceernevnnsbncuhygl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrY2Vlcm5ldm5uc2JuY3VoeWdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NjQ1MTIsImV4cCI6MjA4NjE0MDUxMn0.QmZIlyBXWSz0m6Pg61xBFEKyTVE3dQxWCRj3fTVujGw'

export const supabase = createClient(supabaseUrl, supabaseKey)
