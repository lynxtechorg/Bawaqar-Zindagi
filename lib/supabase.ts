
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://koafroefxddayhgzewcj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvYWZyb2VmeGRkYXloZ3pld2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NDc0ODYsImV4cCI6MjA3ODAyMzQ4Nn0.qHemVTtPgkMnVWRXzBR3h85v8d1pbOrRczGaUQNoJXc';

export const supabase = createClient(supabaseUrl, supabaseKey);
