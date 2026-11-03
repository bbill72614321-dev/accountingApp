export type AccountAccessSnapshot = { accountIds: string[]; checkedAt: string }
export type AccountAccessChanges = { added: string[]; retained: string[]; removed: string[] }

export function compareAccountAccess(previous: readonly string[] | null, current: readonly string[]): AccountAccessChanges | null {
  if (previous === null) return null
  const before = new Set(previous)
  const after = new Set(current)
  return {
    added: [...after].filter((id) => !before.has(id)),
    retained: [...after].filter((id) => before.has(id)),
    removed: [...before].filter((id) => !after.has(id)),
  }
}
