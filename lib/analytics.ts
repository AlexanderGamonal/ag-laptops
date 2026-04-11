export type StoreEventName =
  | 'whatsapp_click'
  | 'email_click'
  | 'product_view'
  | 'search_used'
  | 'filters_opened'

export async function trackStoreEvent(
  name: StoreEventName,
  payload: Record<string, unknown> = {}
) {
  const body = JSON.stringify({
    name,
    payload,
    path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    at: new Date().toISOString(),
  })

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([body], { type: 'application/json' })
    navigator.sendBeacon('/api/events', blob)
    return
  }

  await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined)
}
