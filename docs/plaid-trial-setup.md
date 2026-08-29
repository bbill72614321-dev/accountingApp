# Plaid Trial setup

Do these steps yourself in Plaid, Supabase, and Vercel. Do not send bank passwords, Plaid secrets, or the Supabase service-role key in chat.

## 1. Apply the database migration

In Supabase SQL Editor, run the contents of `supabase/migrations/202608280001_plaid_transactions.sql`. This adds the private Plaid tables and transaction review fields.

## 2. Create Plaid credentials

Create a Plaid Trial account, enable **Transactions**, and create a Production-capable application. Keep the Trial limit at ten Items or fewer. Use Sandbox first, then connect exactly one real Trial Item for final verification.

## 3. Configure Vercel environment variables

Add these values to **Production** and redeploy:

```text
NEXT_PUBLIC_APP_URL=https://your-vercel-domain
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-secret
PLAID_ENV=production
PLAID_TOKEN_ENCRYPTION_KEY=base64-32-byte-key
```

Generate the encryption key locally and paste only its output into Vercel:

```bash
openssl rand -base64 32
```

Never use `NEXT_PUBLIC_` for any secret.

## 4. Configure Plaid URLs

Set the webhook endpoint to:

```text
https://your-vercel-domain/api/plaid/webhook
```

If an institution requires OAuth, add your deployed app URL to Plaid's allowed redirect URIs. The app supplies the webhook URL automatically when it creates a Link token.

## 5. Verify safely

1. In Sandbox, connect one test Item, then check `/banks` and `/transactions`.
2. Confirm an imported transaction is labelled **Needs review** and is absent from monthly totals.
3. Confirm it, then verify it appears in the monthly report and Excel export.
4. Log into the other user; no connection, account, or transaction from the first user should be visible.
5. Connect exactly one real Trial Item only after all Sandbox checks pass.

The webhook endpoint validates Plaid's ES256 signature, issued-at time, and raw-body SHA-256 before it performs any sync.
