import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

export type EncryptedAccessToken = {
  ciphertext: string
  iv: string
  tag: string
}

function encryptionKey() {
  const key = Buffer.from(process.env.PLAID_TOKEN_ENCRYPTION_KEY ?? '', 'base64')
  if (key.length !== 32) throw new Error('PLAID_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key')
  return key
}

export function encryptAccessToken(accessToken: string): EncryptedAccessToken {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(accessToken, 'utf8'), cipher.final()])
  return { ciphertext: ciphertext.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64') }
}

export function decryptAccessToken(encrypted: EncryptedAccessToken) {
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(encrypted.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(encrypted.tag, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}
