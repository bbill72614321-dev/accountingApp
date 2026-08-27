import { cookies } from 'next/headers'
import type { Language } from '@/features/transactions/categories'

export type Dictionary = {
  login: string; email: string; password: string; forgotPassword: string
  sendResetLink: string; resetPassword: string; confirmPassword: string
  dashboard: string; transactions: string; settings: string; merchant: string; category: string
  date: string; amount: string; note: string; totalSpending: string
  netAmount: string; newTransaction: string; save: string; filters: string
  month: string; search: string; language: string; signOut: string
  noTransactions: string; noCategorySpending: string; noSpendingCategory: string
  syncLater: string; included: string; excluded: string; edit: string; delete: string
  merchantRules: string; noMerchantRules: string
  invalidLogin: string; resetSent: string; updateFailed: string
  recoveryExpired: string; passwordUpdated: string
}

export const dictionaries: Record<Language, Dictionary> = {
  en: {
    login: 'Sign in', email: 'Email', password: 'Password', forgotPassword: 'Forgot password?',
    sendResetLink: 'Send reset link', resetPassword: 'Reset password', confirmPassword: 'Confirm password',
    dashboard: 'Dashboard', transactions: 'Transactions', settings: 'Settings', merchant: 'Merchant', category: 'Category',
    date: 'Date', amount: 'Amount', note: 'Note', totalSpending: 'Total spending',
    netAmount: 'Net amount', newTransaction: 'New transaction', save: 'Save', filters: 'Filters',
    month: 'Month', search: 'Search', language: 'Language', signOut: 'Sign out',
    noTransactions: 'No transactions found.', noCategorySpending: 'No category spending this month.',
    noSpendingCategory: 'Income / no spending category', syncLater: 'Bank sync is added in Phase 2.',
    included: 'Included', excluded: 'Excluded', edit: 'Edit', delete: 'Delete',
    merchantRules: 'Merchant rules', noMerchantRules: 'No merchant rules yet.', invalidLogin: 'Unable to sign in.',
    resetSent: 'If the account exists, a reset link has been sent.', updateFailed: 'Unable to update password.',
    recoveryExpired: 'Recovery session expired.', passwordUpdated: 'Password updated.',
  },
  'zh-TW': {
    login: '登入', email: '電子郵件', password: '密碼', forgotPassword: '忘記密碼？',
    sendResetLink: '寄送重設連結', resetPassword: '重設密碼', confirmPassword: '確認密碼',
    dashboard: '每月結算', transactions: '交易紀錄', settings: '設定', merchant: '商家', category: '分類',
    date: '日期', amount: '金額', note: '備註', totalSpending: '支出',
    netAmount: '淨額', newTransaction: '新增交易', save: '儲存', filters: '篩選',
    month: '月份', search: '搜尋', language: '語言', signOut: '登出',
    noTransactions: '找不到交易紀錄。', noCategorySpending: '本月尚無分類支出。',
    noSpendingCategory: '收入／不列支出分類', syncLater: '銀行同步會在第二階段加入。',
    included: '列入結算', excluded: '不列入結算', edit: '編輯', delete: '刪除',
    merchantRules: '商家分類規則', noMerchantRules: '目前沒有商家分類規則。', invalidLogin: '無法登入。',
    resetSent: '如果帳戶存在，重設連結已寄出。', updateFailed: '無法更新密碼。',
    recoveryExpired: '密碼重設工作階段已過期。', passwordUpdated: '密碼已更新。',
  },
}

export function getDictionary(language: Language): Dictionary {
  return dictionaries[language]
}

export async function getLanguage(): Promise<Language> {
  return (await cookies()).get('app-language')?.value === 'en' ? 'en' : 'zh-TW'
}
