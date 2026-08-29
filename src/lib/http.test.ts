import { describe, expect, it } from 'vitest'
import { responseErrorMessage } from './http'

describe('responseErrorMessage', () => {
  it('falls back when an error response has no JSON body', async () => {
    expect(await responseErrorMessage(new Response(null, { status: 500 }), 'Unable to connect bank'))
      .toBe('Unable to connect bank')
  })
})
