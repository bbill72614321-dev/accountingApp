export function defaultPersonalShareCents(amountCents: number, splitCount: number) {
  return Math.round(Math.abs(amountCents) / splitCount)
}

export function owedAmountCents(totalAmountCents: number, personalAmountCents: number) {
  return totalAmountCents - personalAmountCents
}

export function shouldTrackReimbursement(totalAmountCents: number, personalAmountCents: number) {
  return owedAmountCents(totalAmountCents, personalAmountCents) > 0
}

export function effectiveReportAmountCents(amountCents: number, personalAmountCents: number | null) {
  return personalAmountCents === null ? amountCents : -personalAmountCents
}

export function canSaveSplitPayment({
  amountCents,
  splitCount,
  personalAmountCents,
}: {
  amountCents: number
  splitCount: number
  personalAmountCents: number
}) {
  return amountCents < 0
    && Number.isInteger(splitCount)
    && splitCount >= 2
    && Number.isInteger(personalAmountCents)
    && personalAmountCents >= 0
    && personalAmountCents <= Math.abs(amountCents)
}
