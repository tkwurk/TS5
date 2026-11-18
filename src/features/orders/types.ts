export interface OrderLine {
  timestamp?: string
  orderNumber?: string
  product?: string
  qty?: number | string
  price?: number | string
  total?: number | string
  payment?: string
  outlet?: string
  username?: string
}

/** Shape of the report.requested pipeline result for recentOrders. */
export interface RecentOrdersPipeline {
  steps?: {
    reporting?: {
      data?: { report?: { orders?: OrderLine[]; count?: number } }
      report?: { orders?: OrderLine[]; count?: number }
    }
  }
}

export function ordersOf(data: RecentOrdersPipeline | null | undefined): OrderLine[] {
  const reporting = data?.steps?.reporting
  return reporting?.data?.report?.orders ?? reporting?.report?.orders ?? []
}
