import { callApi, callPositional, callSecure, rpc } from '@/services/api'
import type { ApiEnvelope, AuthContext } from '@/services/api'

/** Normalized product row (keys upper-cased, spaces removed — as the original UI did). */
export type BuyProduct = Record<string, unknown> & {
  NAME?: string
  CATEGORY?: string
  TYPE?: string
  MODE?: string
  BUYPRICE?: number | string
  PRICE?: number | string
  BUYUNIT?: string
  BUYUNITSIZE?: string | number
  SUPPLIER?: string
  OUTLET?: string
  PRODUCTCODE?: string
  QUANTITYVARIABLE?: string
  ACTIVE?: string
}

export interface PurchaseItem {
  key: string
  name: string
  productName: string
  code: string
  category: string
  supplier: string
  buyUnit: string
  buyUnitSize: string | number
  price: number
  qty: number
  expiryDate?: string
  mode?: string
  isVariable?: boolean
  isMisc?: boolean
}

export interface OrderedPurchase {
  rowIndex: number
  purchaseId: string
  date: string
  product: string
  supplier: string
  qty: number
  outlet: string
  pstatus: string
  rquantity: number
}

export interface Account {
  name: string
  type?: string
  [k: string]: unknown
}

export type PurchaseHistoryGrouping = 'none' | 'product' | 'week'
export type PurchaseHistoryFilters = Partial<Record<'date' | 'product' | 'qty' | 'unit' | 'price' | 'total' | 'payment' | 'username' | 'pstatus' | 'rquantity', string>>

export type PurchaseHistoryRow = Record<string, unknown> & OrderedPurchase & {
  weekStart: string
  code: string
  unit: string
  price: number
  total: number
  account: string
  payment: string
  username: string
}

export interface PurchaseHistory {
  groups: {
    key: string
    product: string
    code: string
    unit: string
    weekStart: string
    rows: PurchaseHistoryRow[]
    total: number
  }[]
  count: number
  total: number
}

export async function fetchPurchaseHistory(auth: AuthContext, local: boolean, groupBy: PurchaseHistoryGrouping) {
  const res = await callApi<{ steps: { purchaseHistory: ApiEnvelope<PurchaseHistory> } }>(
    'purchase.history.requested', { local, groupBy }, auth,
  )
  if (!res.success) throw new Error(res.error || 'Unable to load purchasing history.')
  const step = res.data?.steps?.purchaseHistory
  if (!step?.success || !step.data || !Array.isArray(step.data.groups)) {
    throw new Error(step?.error || 'Invalid purchasing history response.')
  }
  return step.data
}

function normalize(p: Record<string, unknown>): BuyProduct {
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(p)) out[k.toUpperCase().replace(/\s+/g, '')] = p[k]
  return out as BuyProduct
}

/** All products (all types), normalized. The screens filter by TYPE/MODE/outlet client-side like the original. */
export async function fetchAllProducts(auth: AuthContext): Promise<{ products: BuyProduct[]; error: string | null }> {
  const res = await rpc<unknown>('getProductsSecure', [{ type: 'ALL_TYPES', userOutlet: auth.outlet, _authContext: auth }])
  if (!res.success) return { products: [], error: res.error ?? 'Request failed' }
  let raw: unknown = res.data
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw)
    } catch {
      return { products: [], error: 'Invalid product data' }
    }
  }
  return { products: Array.isArray(raw) ? (raw as Record<string, unknown>[]).map(normalize) : [], error: null }
}

export function outletMatches(productOutlet: string | undefined, outlet: string): boolean {
  if (!productOutlet) return true
  const list = productOutlet.split(',').map((o) => o.trim().toLowerCase())
  const cur = outlet.toLowerCase()
  return list.includes('all') || list.some((o) => o === cur || cur.includes(o) || o.includes(cur))
}

export const isActive = (p: BuyProduct) => {
  const v = (p.ACTIVE ?? '').toString().trim().toUpperCase()
  return !v || !['N', 'NO', 'FALSE', '0'].includes(v)
}

export async function fetchExpenseAccounts(): Promise<Account[]> {
  const r = await callPositional<unknown>('getExpenseAccounts', [])
  const d = r.data
  if (Array.isArray(d)) return d.map((a) => (typeof a === 'string' ? { name: a } : (a as Account)))
  return []
}

export function recordPurchase(
  p: { items: PurchaseItem[]; account: string; payment: string },
  auth: AuthContext,
) {
  const id = Date.now() + '_' + Math.random().toString(36).slice(2, 11)
  const items = p.items.map((i) => ({
    name: i.name,
    price: i.price,
    qty: i.qty,
    category: i.category,
    productName: i.productName || i.name,
    code: i.code,
    supplier: i.supplier,
    buyUnit: i.buyUnit,
    buyUnitSize: i.buyUnitSize,
    expiryDate: i.expiryDate ?? '',
    mode: i.mode ?? '',
    isMisc: i.isMisc === true,
  }))
  const total = items.reduce((s, i) => s + i.price * i.qty, 0)
  return callSecure<{ purchaseId?: string }>(
    'recordPurchaseSecure',
    { id, items, account: p.account, total, payment: p.payment, timestamp: new Date().toISOString() },
    auth,
  )
}

export async function fetchOrderedPurchases(auth: AuthContext): Promise<OrderedPurchase[]> {
  const r = await callPositional<OrderedPurchase[] | { data?: OrderedPurchase[] }>('getOrderedPurchases', [auth.deviceId, auth.username])
  const d = r.data
  return Array.isArray(d) ? d : (d?.data ?? [])
}

export const markReceived = (rowIndex: number, rquantity: number, auth: AuthContext) =>
  callSecure('updateReceiveQuantitySecure', { rowIndex, rquantity }, auth)
