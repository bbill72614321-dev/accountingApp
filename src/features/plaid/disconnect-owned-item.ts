export type PlaidItemRemovalGateway = {
  removeItem(input: { accessToken: string }): Promise<void>
}

export type OwnedItemDeletionRepository = {
  findOwnedItem(userId: string, itemId: string): Promise<{ accessToken: string } | null>
  deleteOwnedItem(userId: string, itemId: string): Promise<void>
}

export async function disconnectOwnedItem({
  userId,
  itemId,
  gateway,
  repository,
}: {
  userId: string
  itemId: string
  gateway: PlaidItemRemovalGateway
  repository: OwnedItemDeletionRepository
}) {
  const item = await repository.findOwnedItem(userId, itemId)
  if (!item) throw new Error('Not found')

  try {
    await gateway.removeItem({ accessToken: item.accessToken })
  } catch {
    throw new Error('Unable to remove bank connection')
  }

  await repository.deleteOwnedItem(userId, itemId)
}
