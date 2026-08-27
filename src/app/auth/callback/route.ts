import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const POST_AUTH_PATHS = new Set(['/reset-password', '/dashboard', '/transactions', '/settings'])

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const requestedNext = request.nextUrl.searchParams.get('next')
  const next = requestedNext && POST_AUTH_PATHS.has(requestedNext)
    ? requestedNext
    : '/reset-password'

  if (code) {
    const supabase = await createServerClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL(next, request.url))
}
