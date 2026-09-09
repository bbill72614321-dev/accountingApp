export function compareTransactionDisplayOrder(
  left: { id: string; transactionDate: string; createdAt: string },
  right: { id: string; transactionDate: string; createdAt: string },
) {
  return right.transactionDate.localeCompare(left.transactionDate)
    || right.createdAt.localeCompare(left.createdAt)
    || right.id.localeCompare(left.id)
}
