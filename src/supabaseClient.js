import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://buskszxuejsmjnrbvtfg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1c2tzenh1ZWpzbWpucmJ2dGZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4OTE1MzEsImV4cCI6MjA1NjQ2NzUzMX0.Q7hwd8clGipAjWRED5H9ixmNN1UA5JlmOK3Ok4I8kbY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 