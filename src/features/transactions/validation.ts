import { z } from 'zod'
import { CATEGORIES } from './categories'
import { parseUsdToCents } from './money'

export function canUseIncomeCategory(amountCents: number) {
  return amountCents >= 0
}

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
})

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
})

export const updatePasswordSchema = z.object({
  password: z.string().min(8).max(128),
  confirmation: z.string().min(8).max(128),
}).refine(({ password, confirmation }) => password === confirmation, {
  message: 'Passwords do not match', path: ['confirmation'],
})

export const manualTransactionSchema = z.object({
  merchant: z.string().trim().max(200),
  category: z.preprocess((value) => value === '' ? null : value, z.enum(CATEGORIES).nullable()),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(['expense', 'income']),
  amount: z.string().transform((value, context) => {
    try {
      return parseUsdToCents(value)
    } catch (error) {
      context.addIssue({
        code: 'custom',
        message: error instanceof Error ? error.message : 'Enter a valid USD amount',
      })
      return z.NEVER
    }
  }),
  note: z.string().trim().max(1000),
}).superRefine(({ type, category }, context) => {
  if (type === 'expense' && category === null) {
    context.addIssue({ code: 'custom', path: ['category'], message: 'Spending requires a category' })
  }
  if (type === 'income' && category !== null) {
    context.addIssue({ code: 'custom', path: ['category'], message: 'Income cannot have a spending category' })
  }
}).transform(({ amount, type, ...transaction }) => ({
  ...transaction,
  amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
}))
