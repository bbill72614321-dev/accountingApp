import { z } from 'zod'

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
})

export function getPublicEnv() {
  const env = publicSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })
  return {
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }
}

export function getServerEnv() {
  const publicEnv = getPublicEnv()
  const appUrl = z.string().url().parse(process.env.NEXT_PUBLIC_APP_URL)
  return { ...publicEnv, appUrl }
}

const plaidSchema = z.object({
  PLAID_CLIENT_ID: z.string().min(1),
  PLAID_SECRET: z.string().min(1),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']),
  PLAID_TOKEN_ENCRYPTION_KEY: z.string().min(1).refine(
    (value) => Buffer.from(value, 'base64').length === 32,
    'PLAID_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key',
  ),
})

export function getPlaidEnv() {
  const env = plaidSchema.parse({
    PLAID_CLIENT_ID: process.env.PLAID_CLIENT_ID,
    PLAID_SECRET: process.env.PLAID_SECRET,
    PLAID_ENV: process.env.PLAID_ENV,
    PLAID_TOKEN_ENCRYPTION_KEY: process.env.PLAID_TOKEN_ENCRYPTION_KEY,
  })
  return {
    clientId: env.PLAID_CLIENT_ID,
    secret: env.PLAID_SECRET,
    environment: env.PLAID_ENV,
    tokenEncryptionKey: env.PLAID_TOKEN_ENCRYPTION_KEY,
  }
}

export function getSupabaseAdminEnv() {
  return {
    supabaseUrl: z.string().url().parse(process.env.NEXT_PUBLIC_SUPABASE_URL),
    serviceRoleKey: z.string().min(1).parse(process.env.SUPABASE_SERVICE_ROLE_KEY),
  }
}
