/** Reports data access — via the Seam 1 API only (api.report → Orchestrator). */
import { api } from '@/services/api'
import type { ApiEnvelope, AuthContext } from '@/services/api'
import type { ReportPipeline } from './types'

export function fetchSalesSummary(
  outlet: string,
  auth?: AuthContext,
): Promise<ApiEnvelope<ReportPipeline>> {
  return api.report<ReportPipeline>('salesSummary', { outlet }, auth)
}
