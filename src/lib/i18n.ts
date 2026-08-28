import { cookies } from 'next/headers'
import type { Language } from '@/features/transactions/categories'
import { createServerClient } from '@/lib/supabase/server'

export type Dictionary = {
  login: string; email: string; password: string; forgotPassword: string
  sendResetLink: string; resetPassword: string; confirmPassword: string
  dashboard: string; transactions: string; settings: string; merchant: string; category: string
  date: string; amount: string; transactionType: string; expense: string; income: string; note: string; totalSpending: string
  netAmount: string; newTransaction: string; save: string; filters: string
  spentThisMonth: string; needsReview: string; ready: string; manual: string; imported: string
  clearFilters: string; results: string; noFilteredTransactions: string
  month: string; search: string; language: string; signOut: string
  noTransactions: string; noCategorySpending: string; noSpendingCategory: string
  syncLater: string; included: string; excluded: string; edit: string; delete: string
  deleteConfirmation: string
  merchantRules: string; noMerchantRules: string
  traditionalChinese: string; english: string
  invalidTransaction: string; saveTransactionFailed: string; updateTransactionFailed: string
  invalidLogin: string; resetSent: string; updateFailed: string
  recoveryExpired: string; passwordUpdated: string; privateLedgerDescription: string
  downloadExcel: string; savePdf: string; monthlySummary: string; categorySummary: string; transactionDetails: string
}

export const dictionaries: Record<Language, Dictionary> = {
  en: {
    login: 'Sign in', email: 'Email', password: 'Password', forgotPassword: 'Forgot password?',
    sendResetLink: 'Send reset link', resetPassword: 'Reset password', confirmPassword: 'Confirm password',
    dashboard: 'Dashboard', transactions: 'Transactions', settings: 'Settings', merchant: 'Merchant', category: 'Category',
    date: 'Date', amount: 'Amount', transactionType: 'Type', expense: 'Expense', income: 'Income', note: 'Note', totalSpending: 'Total spending',
    netAmount: 'Net amount', newTransaction: 'New transaction', save: 'Save', filters: 'Filters',
    spentThisMonth: 'Spent this month', needsReview: 'Needs review', ready: 'Ready', manual: 'Manual', imported: 'Imported',
    clearFilters: 'Clear filters', results: 'results', noFilteredTransactions: 'No transactions match these filters.',
    month: 'Month', search: 'Search', language: 'Language', signOut: 'Sign out',
    noTransactions: 'No transactions found.', noCategorySpending: 'No category spending this month.',
    noSpendingCategory: 'Income / no spending category', syncLater: 'Bank sync is added in Phase 2.',
    included: 'Included', excluded: 'Excluded', edit: 'Edit', delete: 'Delete',
    deleteConfirmation: 'Delete this manual transaction? This cannot be undone.',
    merchantRules: 'Merchant rules', noMerchantRules: 'No merchant rules yet.', invalidLogin: 'Unable to sign in.',
    traditionalChinese: 'Traditional Chinese', english: 'English',
    invalidTransaction: 'Check the transaction fields and try again.',
    saveTransactionFailed: 'Unable to save the transaction.', updateTransactionFailed: 'Unable to update the transaction.',
    resetSent: 'If the account exists, a reset link has been sent.', updateFailed: 'Unable to update password.',
    recoveryExpired: 'Recovery session expired.', passwordUpdated: 'Password updated.',
    privateLedgerDescription: 'Your monthly picture, kept personal.',
    downloadExcel: 'Download Excel', savePdf: 'Save as PDF', monthlySummary: 'Monthly summary',
    categorySummary: 'Category summary', transactionDetails: 'Transaction details',
  },
  'zh-TW': {
    login: '登入', email: '電子郵件', password: '密碼', forgotPassword: '忘記密碼？',
    sendResetLink: '寄送重設連結', resetPassword: '重設密碼', confirmPassword: '確認密碼',
    dashboard: '每月結算', transactions: '交易紀錄', settings: '設定', merchant: '商家', category: '分類',
    date: '日期', amount: '金額', transactionType: '類型', expense: '支出', income: '收入', note: '備註', totalSpending: '支出',
    netAmount: '淨額', newTransaction: '新增交易', save: '儲存', filters: '篩選',
    spentThisMonth: '本月支出', needsReview: '待確認', ready: '已確認', manual: '手動輸入', imported: '匯入',
    clearFilters: '清除篩選', results: '筆結果', noFilteredTransactions: '沒有符合這些篩選條件的交易紀錄。',
    month: '月份', search: '搜尋', language: '語言', signOut: '登出',
    noTransactions: '找不到交易紀錄。', noCategorySpending: '本月尚無分類支出。',
    noSpendingCategory: '收入／不列支出分類', syncLater: '銀行同步會在第二階段加入。',
    included: '列入結算', excluded: '不列入結算', edit: '編輯', delete: '刪除',
    deleteConfirmation: '要刪除這筆手動交易嗎？此操作無法復原。',
    merchantRules: '商家分類規則', noMerchantRules: '目前沒有商家分類規則。', invalidLogin: '無法登入。',
    traditionalChinese: '繁體中文', english: '英文',
    invalidTransaction: '請檢查交易欄位後再試。',
    saveTransactionFailed: '無法儲存交易紀錄。', updateTransactionFailed: '無法更新交易紀錄。',
    resetSent: '如果帳戶存在，重設連結已寄出。', updateFailed: '無法更新密碼。',
    recoveryExpired: '密碼重設工作階段已過期。', passwordUpdated: '密碼已更新。',
    privateLedgerDescription: '你的每月帳務，只屬於你。',
    downloadExcel: '下載 Excel', savePdf: '另存為 PDF', monthlySummary: '每月結算',
    categorySummary: '分類結算', transactionDetails: '交易明細',
  },
}

export function getDictionary(language: Language): Dictionary {
  return dictionaries[language]
}

export async function getLanguage(): Promise<Language> {
  const cookieLanguage = (await cookies()).get('app-language')?.value === 'en' ? 'en' : 'zh-TW'

  try {
    const supabase = await createServerClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) return cookieLanguage

    const { data: profile, error } = await supabase.from('profiles').select('language')
      .eq('user_id', authData.user.id).maybeSingle()
    if (!error && (profile?.language === 'en' || profile?.language === 'zh-TW')) return profile.language
  } catch {
    // Keep unauthenticated pages and temporarily unavailable profiles usable.
  }

  return cookieLanguage
}
