import { createClient } from '@supabase/supabase-js';

// Server-only client using a Secret API key — bypasses RLS.
// Never import this in client components.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);
