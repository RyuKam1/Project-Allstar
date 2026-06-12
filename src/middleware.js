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
    
    const role = profile?.role || 'user';
    if (role === 'business' || role === 'admin') {
       url.pathname = '/business/dashboard';
       return NextResponse.redirect(url);
    }
  }

  // 3. Business Dashboard & Protected Flows (verification-aware route matrix)
  if (request.nextUrl.pathname.startsWith('/business/')) {
    if (!user) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    // Fetch role + verification status from DB (metadata can be stale).
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, business_verification_status')
      .eq('id', user.id)
      .single();

    const role = profile?.role || 'user';
    const vStatus = profile?.business_verification_status || 'none';
    const isAdmin = role === 'admin';
    const isVerified = vStatus === 'verified' || role === 'business';

    const pathname = request.nextUrl.pathname;

    // Onboarding + claim are open to any logged-in user (the opt-in surface).
    const onboardingRoutes = ['/business/onboarding', '/business/claim'];
    const isOnboardingRoute = onboardingRoutes.some((p) => pathname.startsWith(p));

    if (!isAdmin && !isOnboardingRoute) {
      // Everything else (dashboard, add/propose, events) requires the user to
      // have at least opted into onboarding. 'none' users get sent to onboarding.
      if (vStatus === 'none' && !isVerified) {
        url.pathname = '/business/onboarding';
        return NextResponse.redirect(url);
      }
    }
  }

  // 4. Admin Routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role || 'user';
    if (role !== 'admin') {
      url.pathname = '/unauthorized';
      return NextResponse.redirect(url);
    }
  }

  return response
}

export const config = {
  matcher: [
    '/profile/:path*',
    '/business/:path*',
    '/admin/:path*'
  ],
};
