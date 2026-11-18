import { useCallback, useState } from 'react'
import type { CartItem } from '../types'

export interface Receipt {
  orderNumber: string
  items: CartItem[]
  payment: string
  total: number
  subtotal?: number
  discount?: number
  paymentSplits?: { method: string; amount: number }[]
  cashTendered?: number
  changeAmount?: number
  openCashDrawer?: boolean
  operator: string
  outlet: string
  at: string
}

const KEY = 'ts5.lastReceipt'

function load(): Receipt | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Receipt) : null
  } catch {
    return null
  }
}

/** Remembers the last successfully submitted order so it can be reprinted. */
export function useLastReceipt() {
  const [receipt, setReceipt] = useState<Receipt | null>(load)

  const remember = useCallback((r: Receipt) => {
    setReceipt(r)
    localStorage.setItem(KEY, JSON.stringify(r))
  }, [])

  return { receipt, remember }
}
