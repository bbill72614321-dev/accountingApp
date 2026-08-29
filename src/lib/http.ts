export async function responseErrorMessage(response: Response, fallback: string) {
  const text = await response.text()
  if (!text) return fallback
  try {
    const body = JSON.parse(text) as { error?: unknown }
    return typeof body.error === 'string' && body.error ? body.error : fallback
  } catch {
    return fallback
  }
}
