import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl.clone();
  
  // 1. Redirect Authenticated Users away from Auth Pages
  // REMOVED: User wants the login page to show "You are already logged in" instead of auto-redirecting.
  // We leave the request to proceed to the page, and the page component will handle the UI.


  // 2. Redirect Business Users away from User Profile
  if (user && request.nextUrl.pathname.startsWith('/profile')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    const role = profile?.role || user.user_metadata?.role || 'user';
    if (role === 'business' || role === 'admin') {
       url.pathname = '/business/dashboard';
       return NextResponse.redirect(url);
    }
  }

  // 3. Business Dashboard & Protected Flows
  if (request.nextUrl.pathname.startsWith('/business/') || request.nextUrl.pathname === '/business/dashboard') {
    if (!user) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    // Role Check - Fetch from DB for robustness (metadata might be stale)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    const role = profile?.role || user.user_metadata?.role || 'user';
    
    if (role !== 'business' && role !== 'admin') {
      // User is logged in but trying to access business area without permission
      url.pathname = '/unauthorized'; 
      return NextResponse.redirect(url);
    }
  }

  return response
}

export const config = {
  matcher: [
    '/business/:path*'
  ],
};
