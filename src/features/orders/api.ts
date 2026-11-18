/** Orders data access — via the Seam 1 API only (api.report → Orchestrator). */
import { api } from '@/services/api'
import type { ApiEnvelope, AuthContext } from '@/services/api'
import type { RecentOrdersPipeline } from './types'

export function fetchRecentOrders(
  outlet: string,
  limit: number,
  auth?: AuthContext,
): Promise<ApiEnvelope<RecentOrdersPipeline>> {
  return api.report<RecentOrdersPipeline>('recentOrders', { outlet, limit }, auth)
}
