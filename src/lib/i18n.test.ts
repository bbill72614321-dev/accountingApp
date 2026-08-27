import { describe, expect, it } from 'vitest'
import { dictionaries } from './i18n'

describe('translations', () => {
  it('keeps English and Traditional Chinese keys identical', () => {
    expect(Object.keys(dictionaries.en).sort()).toEqual(Object.keys(dictionaries['zh-TW']).sort())
  })
})
