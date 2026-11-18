import { callSecure } from '@/services/api'
import type { AuthContext } from '@/services/api'

export interface CookingProduct {
  productCode: string
  name: string
  category?: string
  sellUnit?: string
  recookThreshold?: number
  cookedToday?: number
}

export interface CookRequest {
  requestId: string
  createdAt?: string
  outlet?: string
  productCode?: string
  productName?: string
  requestedQty: number
  requestedBy?: string
  status: 'REQUESTED' | 'COOKING' | 'DONE' | 'CANCELLED' | string
  severity?: string
  remaining?: number | null
  updatedAt?: string
  handledBy?: string
  notes?: string
  source?: string
  lastNotifiedAt?: string
  notifyCount?: number
}

export interface CookingHistoryRow {
  cookingId: string
  startTime: string
  endTime: string
  productCode: string
  productName: string
  qty: number
  chef: string
  outlet: string
  status: string
  notes: string
}

export interface TodayReportItem {
  productCode?: string
  name: string
  category?: string
  leftoverFromYesterday?: number
  cookedToday?: number
  soldToday?: number
  remaining: number
  recookThreshold: number
  needsRecook: boolean
  stockStatus?: string
}

export const getCookingProducts = (auth: AuthContext) =>
  callSecure<{ items: CookingProduct[]; reportDate?: string }>('getCookingProductsSecure', {}, auth)

export interface BatchRequestOutcome {
  done?: string[]
  stillOpen?: { productCode: string; remaining: number; threshold: number }[]
}
export const submitCookingBatch = (
  p: { startTime: string; endTime: string; notes?: string; lines: { productCode: string; qty: number }[] },
  auth: AuthContext,
) =>
  callSecure<{ cookingId?: string; saved?: unknown[]; requests?: BatchRequestOutcome | null }>(
    'submitCookingBatchSecure',
    { ...p, clientRequestId: `cook-${Date.now()}`, deviceInfo: navigator.userAgent.slice(0, 80) },
    auth,
  )

export const getCookRequests = (auth: AuthContext) =>
  callSecure<{ open: CookRequest[]; recentDone: CookRequest[]; openCount: number }>('getCookRequestsSecure', {}, auth)

export const updateCookRequestStatus = (requestId: string, status: string, auth: AuthContext) =>
  callSecure('updateCookRequestStatusSecure', { requestId, status }, auth)

export const getCookingHistory = (
  p: { startDate?: string; endDate?: string; productFilter?: string },
  auth: AuthContext,
) => callSecure<{ rows: CookingHistoryRow[] }>('getCookingHistorySecure', p, auth)

export const getCookingTodayReport = (reportDate: string | undefined, auth: AuthContext) =>
  callSecure<{ items: TodayReportItem[]; needsRecookCount: number; reportDate?: string; asOf?: string }>(
    'getCookingTodayReportSecure',
    reportDate ? { reportDate } : {},
    auth,
  )
