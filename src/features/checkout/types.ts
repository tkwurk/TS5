import { productName, type ProductRow } from '@/features/catalog'

export interface CartItem {
  key: string
  name: string
  price: number
  qty: number
  category?: string
  navCategory?: string
  /** Sold-out line: excluded from total, saved to Missed Orders instead. */
  isSoldOut?: boolean
  /** Leftover: given away at price 0; originalPrice kept for reference. */
  isLeftover?: boolean
  originalPrice?: number
  /** Variable-quantity product (QUANTITYVARIABLE=yes): fractional qty, adjustable price. */
  isVariableQuantity?: boolean
  /** Free-text item added via the custom-item form. */
  isCustom?: boolean
}

/** Lines that are actually sold (not sold-out). */
export const sellableItems = (items: CartItem[]) => items.filter((i) => !i.isSoldOut)
export const missedItems = (items: CartItem[]) => items.filter((i) => i.isSoldOut)
export const cartTotal = (items: CartItem[]) => sellableItems(items).reduce((s, i) => s + i.price * i.qty, 0)

/** Active payment method row from the PaymentMethod sheet (via getPaymentMethodsSecure). */
export interface PaymentMethod {
  pn: string
  name: string
  destinationAccount: string
  status: string
  outlet: string
  module: string
  openDrawer?: boolean
  autoDeposit?: boolean
}

export type DiscountMode = 'amount' | 'percent'

export interface PaymentSplit {
  method: string
  amount: number
  destinationAccount?: string
  autoDeposit?: boolean
}

/** Everything the payment screen decides; mirrors the original ui_checkout.html pending order. */
export interface PaymentDecision {
  payment: string
  destinationAccount?: string
  autoDeposit?: boolean
  discountMode: DiscountMode
  discountValue: number
  discount: number
  subtotal: number
  total: number
  paymentSplits?: PaymentSplit[]
  /** Cash handed over (cash method, or the cash leg of a split). */
  cashTendered?: number
  changeAmount?: number
  /** Resolved from the method's Open Drawer flag; mirrors resolveOrderOpenCashDrawer. */
  openCashDrawer: boolean
}

/**
 * Mirrors paymentMethodOpensDrawer(): the sheet's Open Drawer column wins;
 * otherwise only "cash" opens the drawer.
 */
export function methodOpensDrawer(name: string, methods: PaymentMethod[]): boolean {
  const key = name.trim().toLowerCase()
  const meta = methods.find((m) => m.name.trim().toLowerCase() === key)
  if (meta && typeof meta.openDrawer === 'boolean') return meta.openDrawer
  return key === 'cash'
}

/**
 * Mirrors resolveOrderOpenCashDrawer(): never for a zero total; for splits only
 * when there is a cash leg (> 0); otherwise by the chosen method.
 */
export function resolveOpenCashDrawer(
  payment: string,
  total: number,
  splits: PaymentSplit[] | undefined,
  methods: PaymentMethod[],
): boolean {
  if (!payment || total <= 0) return false
  if (splits?.length) {
    const cash = splits.filter((s) => isCashLike(s.method)).reduce((a, s) => a + s.amount, 0)
    return cash > 0 && methodOpensDrawer('cash', methods)
  }
  return methodOpensDrawer(payment, methods)
}

/** Mirrors applyDiscountToOrder(): amount or percent, capped at the subtotal, rounded. */
export function computeDiscount(subtotal: number, mode: DiscountMode, value: number): number {
  if (!(value > 0) || !(subtotal > 0)) return 0
  const raw = mode === 'percent' ? Math.min((subtotal * value) / 100, subtotal) : Math.min(value, subtotal)
  return Math.max(0, Math.round(raw))
}

const CASH_LIKE = /^(cash|tunai)$/i
export const isCashLike = (name: string) => CASH_LIKE.test(name.trim())

/** Mirrors isFreePaymentMethodName_: "Free"/"Gratis" orders are fully discounted. */
export const isFreeMethod = (name: string) => /free|gratis/i.test(name)

/**
 * Mirrors ui_checkout.html renderDynamicPaymentButtons(): a method is offered at
 * checkout only if it is active (server-enforced), its Module column is empty
 * (= all modules) or includes "selling" (comma-separated), and it is not one of
 * the special partial/split keys.
 */
export function isSellingMethod(m: PaymentMethod): boolean {
  const key = (m.name || '').trim().toLowerCase()
  if (!key || key === 'partial' || key === 'split') return false
  if ((m.status || '').trim().toLowerCase() !== 'active' && m.status) return false
  const mod = (m.module || '').trim()
  if (!mod) return true
  return mod.split(',').some((s) => s.trim().toLowerCase() === 'selling')
}

/** Same icon map the original checkout used; falls back to a generic card. */
const PAYMENT_ICONS: Record<string, string> = {
  cash: '💵',
  tunai: '💵',
  bank: '🏦',
  transfer: '🏦',
  qris: '📱',
  ovo: '💜',
  gopay: '💚',
  dana: '📲',
  shopeepay: '🧡',
  'credit card': '💳',
  card: '💳',
  debit: '💳',
}
export function paymentIcon(name: string): string {
  return PAYMENT_ICONS[name.trim().toLowerCase()] ?? '💳'
}

/** Shape returned by the checkout.completed pipeline (apiOk data). */
export interface CheckoutResult {
  eventType?: string
  requestId?: string
  steps?: {
    sales?: {
      orderNumber?: string
      data?: { orderNumber?: string; orderNumbers?: string[] }
    }
  }
}

const PRICE_KEYS = ['PRICE', 'Price', 'price', 'UnitPrice', 'Unit Price']

/** Best-effort numeric price from a header-keyed product row. */
export function productPrice(row: ProductRow): number {
  for (const k of PRICE_KEYS) {
    if (k in row) {
      const n = Number(row[k])
      if (!Number.isNaN(n)) return n
    }
  }
  return 0
}

/** Best-effort product image URL from a header-keyed row (Drive file id or URL). */
export function productImage(row: ProductRow): string | null {
  const key = Object.keys(row).find((k) => {
    const u = k.toUpperCase()
    return u === 'IMAGEFILEID' || u === 'IMAGE' || u === 'IMAGEURL'
  })
  const raw = key ? row[key] : undefined
  const id = raw != null ? String(raw).trim() : ''
  if (!id) return null
  if (/^(https?:|data:)/i.test(id)) return id
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w200`
}

/** Mirrors the original: QUANTITYVARIABLE = "yes" → fractional qty + adjustable price. */
export function isVariableQuantityProduct(row: ProductRow): boolean {
  const key = Object.keys(row).find((k) => k.toUpperCase().replace(/\s+/g, '') === 'QUANTITYVARIABLE')
  const v = key ? row[key] : undefined
  return v != null && String(v).trim().toLowerCase() === 'yes'
}

/** Best-effort supplier from a header-keyed product row. */
export function productSupplier(row: ProductRow): string {
  const key = Object.keys(row).find((k) => k.toUpperCase() === 'SUPPLIER')
  const value = key ? row[key] : undefined
  return value != null && String(value).trim() !== '' ? String(value).trim() : 'Other'
}

/** Best-effort category from a header-keyed product row. */
export function productCategory(row: ProductRow): string {
  const key = Object.keys(row).find((k) => /^category$|^cat$|nav ?category/i.test(k))
  const value = key ? row[key] : undefined
  return value != null && String(value).trim() !== '' ? String(value).trim() : 'Other'
}

/** Best-effort product type ('Sell' / 'Buy' / …); defaults to 'Sell'. */
export function productType(row: ProductRow): string {
  const key = Object.keys(row).find((k) => k.toUpperCase() === 'TYPE')
  const value = key ? row[key] : undefined
  return value != null && String(value).trim() !== '' ? String(value).trim() : 'Sell'
}

/** Stable identity for a product row — product code if present, else the name. */
export function productKey(row: ProductRow): string {
  const codeKey = Object.keys(row).find((k) => /product ?code|^code$/i.test(k))
  const code = codeKey ? row[codeKey] : undefined
  return code != null && code !== '' ? String(code) : productName(row)
}

/** Pull the order number out of the nested pipeline result, if present. */
export function orderNumberOf(result: CheckoutResult | null | undefined): string | undefined {
  const sales = result?.steps?.sales
  return sales?.data?.orderNumber ?? sales?.orderNumber
}
