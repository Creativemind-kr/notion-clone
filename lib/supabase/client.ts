import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = 'https://biuojrtaitzgodfcpzja.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpdW9qcnRhaXR6Z29kZmNwemphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NzEzODQsImV4cCI6MjA4ODM0NzM4NH0.LnAOmrwHUVL5-LJwzHe_W9hx1nLwc5D7UpX8Zl78P1E'

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
