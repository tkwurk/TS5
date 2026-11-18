import { useCallback, useState } from 'react'
import type { CartItem } from '../types'

export interface ParkedOrder {
  id: string
  identifier: string
  items: CartItem[]
  payment: string
  total: number
  parkedAt: string
}

const storageKey = (username: string) => `ts5.parked.${username || 'anon'}`

function load(username: string): ParkedOrder[] {
  try {
    const raw = localStorage.getItem(storageKey(username))
    return raw ? (JSON.parse(raw) as ParkedOrder[]) : []
  } catch {
    return []
  }
}

/**
 * Parked (held) orders — mirrors the original ui_orders.html workflow where a
 * cart is parked under a table/customer identifier and retrieved later. Stored
 * per operator in localStorage; never sent to the sheet until submitted.
 */
export function useParkedOrders(username: string) {
  const [orders, setOrders] = useState<ParkedOrder[]>(() => load(username))

  const persist = useCallback(
    (next: ParkedOrder[]) => {
      setOrders(next)
      localStorage.setItem(storageKey(username), JSON.stringify(next))
    },
    [username],
  )

  const park = useCallback(
    (identifier: string, items: CartItem[], payment: string) => {
      const order: ParkedOrder = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        identifier: identifier.trim(),
        items,
        payment,
        total: items.reduce((s, i) => s + i.price * i.qty, 0),
        parkedAt: new Date().toISOString(),
      }
      persist([order, ...orders])
      return order
    },
    [orders, persist],
  )

  const remove = useCallback(
    (id: string) => persist(orders.filter((o) => o.id !== id)),
    [orders, persist],
  )

  /** Returns the order and removes it from the parked list. */
  const retrieve = useCallback(
    (id: string) => {
      const order = orders.find((o) => o.id === id)
      if (order) persist(orders.filter((o) => o.id !== id))
      return order ?? null
    },
    [orders, persist],
  )

  return { orders, park, retrieve, remove }
}
