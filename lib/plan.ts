type UserMeta = Record<string, unknown> | null | undefined

export function isSubscribed(meta: UserMeta): boolean {
  return meta?.subscribed === true
}

export function isTakePlan(meta: UserMeta): boolean {
  const plan = meta?.plan as string | undefined
  return meta?.subscribed === true && (plan === 'take' || plan === 'matsu')
}

export function isMatsuPlan(meta: UserMeta): boolean {
  return meta?.subscribed === true && meta?.plan === 'matsu'
}
