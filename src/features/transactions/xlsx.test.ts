import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { createXlsx } from './xlsx'

describe('createXlsx', () => {
  it('creates a workbook with named sheets and Unicode cell values', () => {
    const archive = unzipSync(createXlsx([
      { name: '每月結算', rows: [['Month', '2026-08'], ['支出', 12.34]] },
      { name: '交易明細', rows: [['商家'], ['Target']] },
    ]))

    expect(strFromU8(archive['xl/workbook.xml'])).toContain('name="每月結算"')
    expect(strFromU8(archive['xl/worksheets/sheet1.xml'])).toContain('12.34')
    expect(strFromU8(archive['xl/worksheets/sheet2.xml'])).toContain('Target')
  })
})
