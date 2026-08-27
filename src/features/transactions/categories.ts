export const CATEGORIES = [
  'Travel', 'Grocery', 'Shopping', 'Car', 'Dine Out', 'Utility',
  'Entertainment', 'Learning', 'Home', 'Cat', 'Other',
] as const

export type Category = (typeof CATEGORIES)[number]
export type Language = 'zh-TW' | 'en'

export const CATEGORY_LABELS: Record<Category, Record<Language, string>> = {
  Travel: { en: 'Travel', 'zh-TW': '旅遊' },
  Grocery: { en: 'Grocery', 'zh-TW': '日常雜貨' },
  Shopping: { en: 'Shopping', 'zh-TW': '購物' },
  Car: { en: 'Car', 'zh-TW': '汽車' },
  'Dine Out': { en: 'Dine Out', 'zh-TW': '外食' },
  Utility: { en: 'Utility', 'zh-TW': '水電與公共費用' },
  Entertainment: { en: 'Entertainment', 'zh-TW': '娛樂' },
  Learning: { en: 'Learning', 'zh-TW': '學習' },
  Home: { en: 'Home', 'zh-TW': '居家' },
  Cat: { en: 'Cat', 'zh-TW': '貓咪' },
  Other: { en: 'Other', 'zh-TW': '其他' },
}
