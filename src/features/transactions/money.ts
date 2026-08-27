import type { Language } from './categories'

const USD_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.(\d{1,2}))?$/

export function parseUsdToCents(input: string): number {
  const value = input.trim()
  const match = USD_PATTERN.exec(value)
  if (!match) throw new Error('Enter a USD amount with at most two decimals')
  const negative = value.startsWith('-')
  const unsigned = negative ? value.slice(1) : value
  const [dollars, fractional = ''] = unsigned.split('.')
  const cents = Number(dollars) * 100 + Number(fractional.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents)) throw new Error('Amount is too large')
  return negative ? -cents : cents
}

export function formatUsd(cents: number, language: Language): string {
  if (!Number.isSafeInteger(cents)) throw new Error('Amount must be integer cents')
  return new Intl.NumberFormat(language === 'zh-TW' ? 'zh-TW' : 'en-US', {
    style: 'currency', currency: 'USD',
  }).format(cents / 100)
}
