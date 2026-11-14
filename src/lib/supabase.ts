import { protectedFetch } from './sessionGate';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!supabaseUrl || !supabaseKey) throw new Error('Supabase URL and publishable key are required.');

export const supabase = createClient(supabaseUrl, supabaseKey, { global: { fetch: (input, init) => {
  const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
  const authorization = headers.get('Authorization');
  // Public reads and Auth token refresh/sign-out retain their normal Supabase flow.
  const url = String(input instanceof Request ? input.url : input);
  return authorization && authorization !== `Bearer ${supabaseKey}` && !url.includes('/auth/v1/')
    ? protectedFetch(input, init) : fetch(input, init);
} } });
