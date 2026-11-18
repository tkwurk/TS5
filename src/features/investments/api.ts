import { callPositional } from '@/services/api'
import type { AuthContext } from '@/services/api'
import { recordPurchase, type Account } from '@/features/purchasing'

export interface InvestmentTx {
  date: string
  supplier: string
  product: string
  category: string
  qty: number
  price: number
  total: number
  account: string
  outlet: string
}

export async function fetchInvestmentAccounts(): Promise<Account[]> {
  const r = await callPositional<unknown>('getInvestmentAccounts', [])
  return Array.isArray(r.data) ? r.data.map((a) => (typeof a === 'string' ? { name: a } : (a as Account))) : []
}

export async function fetchInvestmentTransactions(): Promise<InvestmentTx[]> {
  const r = await callPositional<unknown>('getInvestmentTransactions', [])
  return Array.isArray(r.data) ? (r.data as InvestmentTx[]) : []
}

/**
 * Mirrors ui_showInvestmentReport.html: an investment is saved as a purchase
 * against an Investment-type account (recordPurchaseSecure); the server flags
 * the row as capital so P&L / cash-in-hand exclude it.
 */
export const recordInvestment = (
  p: { detail: string; qty: number; unitPrice: number; account: string; payment: string },
  auth: AuthContext,
) =>
  recordPurchase(
    {
      account: p.account,
      payment: p.payment,
      items: [
        {
          key: 'inv',
          name: p.detail,
          productName: p.detail,
          code: '',
          category: 'Investment',
          supplier: '',
          buyUnit: '',
          buyUnitSize: '',
          price: p.unitPrice,
          qty: p.qty,
        },
      ],
    },
    auth,
  )
