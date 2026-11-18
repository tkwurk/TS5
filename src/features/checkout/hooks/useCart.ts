import { useCallback, useMemo, useState } from 'react'
import { cartTotal, sellableItems, type CartItem } from '../types'

const LEFTOVER_SUFFIX = '::leftover'

/** Isolated cart state + operations (kept out of the view component). */
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])

  const add = useCallback((item: Omit<CartItem, 'qty'>) => {
    setItems((prev) => {
      const i = prev.findIndex((p) => p.key === item.key)
      if (i >= 0) {
        const next = [...prev]
        next[i] = { ...next[i], qty: next[i].qty + 1 }
        return next
      }
      return [...prev, { ...item, qty: 1 }]
    })
  }, [])

  const setQty = useCallback((key: string, qty: number) => {
    setItems((prev) => prev.map((p) => (p.key === key ? { ...p, qty } : p)).filter((p) => p.qty > 0))
  }, [])

  const remove = useCallback((key: string) => {
    setItems((prev) => prev.filter((p) => p.key !== key))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  /** Replace the whole cart (used when retrieving a parked order). */
  const load = useCallback((next: CartItem[]) => setItems(next.map((i) => ({ ...i }))), [])

  /** Mirrors toggleSoldOutFlag(): sold-out lines are excluded from the total and saved as missed. */
  const toggleSoldOut = useCallback((key: string) => {
    setItems((prev) => prev.map((p) => (p.key === key ? { ...p, isSoldOut: !p.isSoldOut } : p)))
  }, [])

  /**
   * Mirrors toggleLeftoverFlag(): a product is either in the cart as a normal
   * line OR as a single zero-priced leftover line (never both).
   */
  const toggleLeftover = useCallback((base: Omit<CartItem, 'qty'>) => {
    const leftoverKey = base.key + LEFTOVER_SUFFIX
    setItems((prev) => {
      if (prev.some((p) => p.key === leftoverKey)) return prev.filter((p) => p.key !== leftoverKey)
      const withoutRegular = prev.filter((p) => p.key !== base.key)
      return [
        ...withoutRegular,
        { ...base, key: leftoverKey, price: 0, qty: 1, isLeftover: true, originalPrice: base.price },
      ]
    })
  }, [])

  const isLeftover = useCallback((key: string) => items.some((p) => p.key === key + LEFTOVER_SUFFIX), [items])

  /** Mirrors addCustomItemToCart(): free-text item in MISC. */
  const addCustom = useCallback((name: string, price: number) => {
    const key = 'custom::' + name.trim().toLowerCase() + '::' + price
    setItems((prev) => {
      const i = prev.findIndex((p) => p.key === key)
      if (i >= 0) {
        const next = [...prev]
        next[i] = { ...next[i], qty: next[i].qty + 1 }
        return next
      }
      return [...prev, { key, name: name.trim(), price, qty: 1, category: 'MISC', isCustom: true }]
    })
  }, [])

  /** Mirrors adjustVariableQuantity(): fractional qty in steps (e.g. 0.1), floored at 0. */
  const adjustVariableQty = useCallback((base: Omit<CartItem, 'qty'>, delta: number) => {
    setItems((prev) => {
      const i = prev.findIndex((p) => p.key === base.key)
      if (i >= 0) {
        const qty = Math.max(0, parseFloat((prev[i].qty + delta).toFixed(1)))
        if (qty === 0) return prev.filter((_, idx) => idx !== i)
        const next = [...prev]
        next[i] = { ...next[i], qty }
        return next
      }
      const qty = Math.max(0, parseFloat(delta.toFixed(1)))
      if (qty === 0) return prev
      return [...prev, { ...base, qty, isVariableQuantity: true }]
    })
  }, [])

  /** Mirrors adjustVariablePrice(): price in steps (e.g. ±1000), floored at 0. */
  const adjustVariablePrice = useCallback((base: Omit<CartItem, 'qty'>, delta: number) => {
    setItems((prev) => {
      const i = prev.findIndex((p) => p.key === base.key)
      if (i >= 0) {
        const next = [...prev]
        next[i] = { ...next[i], price: Math.max(0, next[i].price + delta) }
        return next
      }
      // No line yet: start one at the smallest step so the adjusted price is kept.
      return [...prev, { ...base, price: Math.max(0, base.price + delta), qty: 0.1, isVariableQuantity: true }]
    })
  }, [])

  const total = useMemo(() => cartTotal(items), [items])
  const count = useMemo(() => sellableItems(items).reduce((sum, i) => sum + i.qty, 0), [items])
  const qtyOf = useCallback((key: string) => items.find((p) => p.key === key)?.qty ?? 0, [items])
  const priceOf = useCallback((key: string) => items.find((p) => p.key === key)?.price, [items])

  return {
    items,
    add,
    setQty,
    remove,
    clear,
    load,
    toggleSoldOut,
    toggleLeftover,
    isLeftover,
    addCustom,
    adjustVariableQty,
    adjustVariablePrice,
    total,
    count,
    qtyOf,
    priceOf,
  }
}
