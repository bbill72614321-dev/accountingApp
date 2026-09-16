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
