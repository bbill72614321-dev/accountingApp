export function requireLinkedBankAccountId(
  localAccountIdByPlaidAccountId: ReadonlyMap<string, string>,
  plaidAccountId: string,
) {
  const bankAccountId = localAccountIdByPlaidAccountId.get(plaidAccountId)
  if (!bankAccountId) throw new Error('Unable to find the linked bank account for this Plaid transaction')
  return bankAccountId
}
