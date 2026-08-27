import { describe, expect, it } from 'vitest'
import { formatUsd, parseUsdToCents } from './money'

describe('USD money helpers', () => {
  it.each([
    ['12', 1200], ['12.3', 1230], ['12.34', 1234], ['-0.99', -99],
  ])('parses %s without floating-point arithmetic', (input, expected) => {
    expect(parseUsdToCents(input)).toBe(expected)
  })

  it.each(['', '1.234', '$12', 'NaN', '90071992547410.00'])('rejects %s', (input) => {
    expect(() => parseUsdToCents(input)).toThrow()
  })

  it('formats signed USD cents', () => {
    expect(formatUsd(-1234, 'en')).toBe('-$12.34')
  })
})
