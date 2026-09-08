import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('bank server actions module', () => {
  it('does not export runtime state from a use server module', async () => {
    const source = await readFile(new URL('./banks.ts', import.meta.url), 'utf8')

    expect(source).not.toMatch(/^export const /m)
  })
})
