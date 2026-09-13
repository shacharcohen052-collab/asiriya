import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function getProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return url.match(/https:\/\/([^.]+)\./)?.[1] ?? '';
}

function injectTokenFromHeader(request: NextRequest): void {
  const token = request.headers.get('x-sb-token');
  if (!token) return;
  const hasCookie = request.cookies.getAll().some((c) => c.name.includes('auth-token'));
  if (hasCookie) return;
  request.cookies.set(`sb-${getProjectRef()}-auth-token`, token);
}

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/sign-up-login-screen',
  '/auth/callback',
  '/access-denied',
];

// Routes that require authentication + approval
const PROTECTED_ROUTES = [
  '/',
  '/profile',
  '/members',
  '/score',
  '/settings',
  '/connection-duties',
  '/class-schedule-attendance',
];

export async function middleware(request: NextRequest) {
  injectTokenFromHeader(request);
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Allow public routes always
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  if (isPublicRoute) {
    return supabaseResponse;
  }

  // Not authenticated → redirect to login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-up-login-screen';
    return NextResponse.redirect(url);
  }

  // Authenticated — check approval status for protected routes
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  if (isProtectedRoute) {
    // Fetch profile to check is_approved
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_approved')
      .eq('id', user.id)
      .maybeSingle();

    const isApproved = profile?.is_approved === true;

    if (!isApproved) {
      const url = request.nextUrl.clone();
      url.pathname = '/access-denied';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
