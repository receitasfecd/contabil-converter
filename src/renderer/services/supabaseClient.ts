import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eqwsxtaujtyxabvjugta.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd3N4dGF1anR5eGFidmp1Z3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MzY3MjEsImV4cCI6MjA5NDIxMjcyMX0.k3yVzuk3VT1jQ-ubNQD1NJ58FsylumiV1c9ZfuObS_k';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
