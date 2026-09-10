import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LanguageSwitcher } from './language-switcher'
import { dictionaries } from '@/lib/i18n'

describe('LanguageSwitcher', () => {
  it('does not render a separate save button', () => {
    const html = renderToStaticMarkup(
      <LanguageSwitcher language="zh-TW" dictionary={dictionaries['zh-TW']} />,
    )

    expect(html).not.toContain('<button')
  })
})
