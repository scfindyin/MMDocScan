/**
 * Server-Side Supabase Client with Authentication Context
 * Story 3.4: Template CRUD API Endpoints
 *
 * CRITICAL: This client MUST be used in all API routes requiring authentication.
 * It reads auth context from cookies via Next.js headers, enabling:
 * - Authenticated API requests with user context
 * - Row Level Security (RLS) automatic enforcement via auth.uid()
 * - Secure server-side operations with proper user isolation
 *
 * DO NOT use lib/supabase.ts (anonymous client) for authenticated API routes.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Create Server-Side Supabase Client
 *
 * This function creates a Supabase client with authentication context
 * from Next.js server-side cookies. It enables:
 * - User authentication via auth.getUser()
 * - Row Level Security (RLS) policy enforcement
 * - Secure API operations with user context
 *
 * Usage in API routes:
 * ```typescript
 * import { createClient } from '@/lib/supabase-server'
 *
 * export async function GET(request: Request) {
 *   const supabase = createClient()
 *
 *   // Validate authentication
 *   const { data: { user }, error } = await supabase.auth.getUser()
 *   if (error || !user) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 *   }
 *
 *   // RLS automatically filters by user_id = auth.uid()
 *   const { data, error: dbError } = await supabase
 *     .from('templates')
 *     .select('*')
 *
 *   return NextResponse.json(data)
 * }
 * ```
 *
 * @returns SupabaseClient with authentication context from cookies
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
