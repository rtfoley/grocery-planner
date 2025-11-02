// src/app/auth/confirm/route.ts
import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  if (token_hash && type) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error && data.user) {
      // For invite type, redirect to password setup
      if (type === 'invite') {
        return NextResponse.redirect(new URL('/auth/set-password', request.url))
      }

      // For other types (like email confirmation), redirect to home
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // Failed to verify - redirect to login with error
  return NextResponse.redirect(new URL('/login?error=verification_failed', request.url))
}
