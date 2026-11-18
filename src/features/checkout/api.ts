/**
 * Checkout data access — submits through the Seam 1 API only. Orders go through
 * api.checkout (Orchestrator checkout.completed pipeline → saveOrderSecure);
 * payment methods and the discount expense reuse existing server functions via
 * the RPC bridge. Never touches Sheets directly (see /AGENTS.md).
 */
import { api, rpc } from '@/services/api'
import { localDate } from '@/lib/dates'
import type { ApiEnvelope, AuthContext } from '@/services/api'
import type { CartItem, CheckoutResult, PaymentDecision, PaymentMethod } from './types'
import { isSellingMethod, sellableItems } from './types'

export function submitCheckout(
  items: CartItem[],
  decision: PaymentDecision,
  auth: AuthContext,
): Promise<ApiEnvelope<CheckoutResult>> {
  // Same field names the original ui_checkout.html sends to saveOrderSecure.
  // Sold-out lines are excluded here and saved separately via saveMissedOrders().
  const orderData: Record<string, unknown> = {
    items: sellableItems(items).map((i) => ({
      name: i.name,
      qty: i.qty,
      price: i.price,
      category: i.category ?? '',
      navCategory: i.navCategory ?? i.category ?? '',
      isLeftover: i.isLeftover ?? false,
      originalPrice: i.originalPrice,
      isVariableQuantity: i.isVariableQuantity ?? false,
    })),
    payment: decision.payment,
    total: decision.total,
    originalTotal: decision.subtotal,
    discount: decision.discount,
    discountMode: decision.discountMode,
    discountValue: decision.discountValue,
    openCashDrawer: decision.openCashDrawer,
    submittedAt: new Date().toISOString(),
  }
  if (decision.destinationAccount) orderData.destinationAccount = decision.destinationAccount
  if (decision.autoDeposit !== undefined) orderData.autoDeposit = decision.autoDeposit
  if (decision.paymentSplits?.length) orderData.paymentSplits = decision.paymentSplits
  if (decision.cashTendered !== undefined) {
    orderData.cashTendered = decision.cashTendered
    orderData.changeAmount = decision.changeAmount ?? 0
  }
  return api.checkout<CheckoutResult>({ orderData }, auth)
}

/**
 * Active payment methods for the signed-in user's outlet, filtered to those
 * enabled for the selling (checkout) module. Returns `null` on failure so the UI
 * can distinguish "none configured" from "could not load".
 */
export async function fetchPaymentMethods(auth: AuthContext): Promise<PaymentMethod[] | null> {
  const list = await fetchAllPaymentMethods(auth)
  return list ? list.filter(isSellingMethod) : null
}

// Per-session cache: loaded once after login, reused by every module. Failures are not cached.
let methodsCache: { key: string; promise: Promise<PaymentMethod[] | null> } | null = null

const authKey = (auth: AuthContext) => `${auth.username}|${auth.outlet ?? ''}`

async function loadPaymentMethods(auth: AuthContext): Promise<PaymentMethod[] | null> {
  const res = await rpc<unknown>('getPaymentMethodsSecure', [{ _authContext: auth }])
  if (!res.success) return null
  const d = res.data
  if (Array.isArray(d)) return d as PaymentMethod[]
  if (d && typeof d === 'object' && Array.isArray((d as { data?: unknown }).data)) {
    return (d as { data: PaymentMethod[] }).data
  }
  return []
}

/** Raw active methods from the sheet (all modules), cached for the session. */
export function fetchAllPaymentMethods(auth: AuthContext): Promise<PaymentMethod[] | null> {
  const key = authKey(auth)
  if (methodsCache?.key === key) return methodsCache.promise
  const promise = loadPaymentMethods(auth).catch(() => null)
  const entry = { key, promise }
  methodsCache = entry
  promise.then((list) => {
    if (list === null && methodsCache === entry) methodsCache = null
  })
  return promise
}

/** Warm the cache right after login. */
export function prefetchPaymentMethods(auth: AuthContext): void {
  void fetchAllPaymentMethods(auth)
}

export function clearPaymentMethodsCache(): void {
  methodsCache = null
}

/** Methods enabled for a given module (empty Module column = all modules), like _getCachedPaymentMethodsForModule. */
export async function fetchPaymentMethodsForModule(auth: AuthContext, module: string): Promise<PaymentMethod[]> {
  const list = (await fetchAllPaymentMethods(auth)) ?? []
  const want = module.toLowerCase()
  return list.filter((m) => {
    const key = (m.name || '').trim().toLowerCase()
    if (!key || key === 'partial' || key === 'split') return false
    const mod = (m.module || '').trim()
    return !mod || mod.split(',').some((s) => s.trim().toLowerCase() === want)
  })
}

/**
 * Mirrors the original: after a successful order with a discount, record the
 * discount as an expense (fire-and-forget on the caller's side).
 */
export function recordDiscountExpense(
  amount: number,
  payment: string,
  orderRef: string,
  auth: AuthContext,
): Promise<ApiEnvelope<unknown>> {
  const date = localDate()
  return rpc('recordExpenseSecure', [
    { amount, account: 'Discount', payment, note: orderRef, date, _authContext: auth },
  ])
}

/** Mirrors submitOrderDirectly(): sold-out lines are saved to Missed Orders. */
export function saveMissedOrders(
  items: CartItem[],
  orderNumber: string,
  auth: AuthContext,
): Promise<ApiEnvelope<unknown>> {
  const missedData = JSON.stringify({
    orderNumber,
    items: items.map((i) => ({ name: i.name, qty: i.qty, price: i.price, category: i.category ?? '' })),
  })
  return rpc('saveMissedOrdersSecure', [{ missedData, _authContext: auth }])
}

// ── Manual cash-drawer open (PIN-protected) — mirrors promptCashDrawerOpen() ──

export interface DrawerUnlockStatus {
  pinConfigured?: boolean
  pinWindowActive?: boolean
  pendingOpen?: boolean
  pendingForYou?: boolean
  [k: string]: unknown
}

export async function getDrawerStatus(auth: AuthContext): Promise<DrawerUnlockStatus | null> {
  const res = await rpc<DrawerUnlockStatus>('getDrawerUnlockStatusSecure', [{ outlet: auth.outlet, _authContext: auth }])
  return res.success ? ((res.data as DrawerUnlockStatus) ?? (res as unknown as DrawerUnlockStatus)) : null
}

export function validateDrawerPin(pin: string, auth: AuthContext): Promise<ApiEnvelope<unknown>> {
  return rpc('validateDrawerUnlockPinSecure', [{ outlet: auth.outlet, pin, _authContext: auth }])
}

export function authorizeDrawerOpen(auth: AuthContext): Promise<ApiEnvelope<unknown>> {
  return rpc('authorizeCashDrawerOpenSecure', [{ outlet: auth.outlet, _authContext: auth }])
}

export function logDrawerOpen(result: string, auth: AuthContext): Promise<ApiEnvelope<unknown>> {
  return rpc('logCashDrawerOpenSecure', [
    { outlet: auth.outlet, printerName: '', result, clientAt: new Date().toISOString(), _authContext: auth },
  ])
}

// ── Kitchen recook alerts shown on the ordering screen ──

export interface RecookItem {
  productCode?: string
  name: string
  category?: string
  remaining: number
  recookThreshold: number
  needsRecook: boolean
  stockStatus?: string
}

export async function fetchRecookAlerts(auth: AuthContext): Promise<{ items: RecookItem[]; alerts: RecookItem[] } | null> {
  const res = await rpc<{ items?: RecookItem[]; alerts?: RecookItem[] }>('getRecookAlertsSecure', [
    { outlet: auth.outlet, _authContext: auth },
  ])
  if (!res.success) return null
  const d = (res.data ?? res) as { items?: RecookItem[]; alerts?: RecookItem[] }
  return { items: d.items ?? [], alerts: d.alerts ?? [] }
}
