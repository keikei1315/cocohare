export function resolveNoteLimit(
  userMeta: Record<string, unknown> | null | undefined,
  hasHighTicket: boolean,
): { limit: number; useMonthlyReset: boolean } {
  const isMatsu = userMeta?.subscribed === true && userMeta?.plan === 'matsu'
  if (isMatsu && hasHighTicket) return { limit: 5, useMonthlyReset: true }
  if (isMatsu) return { limit: 3, useMonthlyReset: true }
  return { limit: 3, useMonthlyReset: false }
}
