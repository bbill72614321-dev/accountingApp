import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const styles = readFileSync(new URL('./globals.css', import.meta.url), 'utf8')

describe('mobile monthly category chart', () => {
  it('hides the pie chart while keeping the category legend available', () => {
    const mobileStyles = styles.split('@media (max-width: 760px) {')[1]?.split('@media (prefers-reduced-motion: reduce)')[0]

    expect(mobileStyles).toContain('.category-pie { display: none; }')
    expect(mobileStyles).toContain('.category-chart-body { display: block; }')
  })
})

describe('mobile split payment dialog', () => {
  it('keeps split fields and actions touch-friendly inside the viewport', () => {
    const mobileStyles = styles.split('@media (max-width: 760px) {')[1]?.split('@media (prefers-reduced-motion: reduce)')[0]

    expect(mobileStyles).toContain('.split-dialog { max-height: calc(100dvh - 1.5rem); width: calc(100vw - 1.5rem); }')
    expect(mobileStyles).toContain('.split-form { gap: 0.75rem; max-height: calc(100dvh - 1.5rem); overflow-y: auto; padding: 1rem; }')
    expect(mobileStyles).toContain('.split-actions .button { flex: 1; min-height: 2.75rem; }')
  })
})
