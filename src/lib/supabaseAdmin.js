import { createClient } from '@supabase/supabase-js';

// WARNING: Use this ONLY on the server side!
// Never import this into Client Components.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
    throw new Error('MISSING NEXT_PUBLIC_SUPABASE_URL');
}

// Fallback to avoid crash during build if key is missing, but will fail at runtime if used
const serviceKey = supabaseServiceRoleKey || 'MISSING_KEY';

export const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
