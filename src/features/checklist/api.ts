import { callPositional } from '@/services/api'
import { localDate } from '@/lib/dates'
import type { AuthContext } from '@/services/api'

export interface ChecklistDef {
  id: string
  name: string
  description?: string
  status?: string
  canFill?: boolean
  canReview?: boolean
}
export interface ChecklistQuestion {
  sn: string
  checklistId: string
  question: string
  questionType: string // text | yesno | dropdown | number | ...
  dropdownValues?: string
  status?: string
  category?: string
  mandatory?: boolean
}
export interface ChecklistResponse {
  datetime: string
  filledBy: string
  checklistId: string
  questionSn: string
  response: string
  outlet: string
  comments: string
  shiftId: string
  status?: string
}
export interface FillBundle {
  questions: ChecklistQuestion[]
  status: { submitted: boolean; responses: ChecklistResponse[] }
}
export interface ReviewItem {
  shiftId: string
  checklistId: string
  checklistName: string
  outlet: string
  filledBy: string
  submittedAt: string
  responseCount: number
}

const arr = <T,>(d: unknown): T[] => (Array.isArray(d) ? (d as T[]) : [])

export const fetchDefinitions = async (auth: AuthContext) =>
  arr<ChecklistDef>((await callPositional('getChecklistDefinitions', [auth.deviceId, auth.username])).data)

export const fetchFillBundle = async (auth: AuthContext, checklistId: string, shiftId: string) =>
  (await callPositional<FillBundle>('getChecklistFillBundle', [auth.deviceId, auth.username, checklistId, shiftId, auth.outlet])).data

export const submitResponses = (
  auth: AuthContext,
  p: { checklistId: string; shiftId: string; responses: { questionSn: string; response: string; comments?: string }[] },
) =>
  callPositional<{ shiftId?: string; count?: number }>('submitChecklistResponses', [
    JSON.stringify({ ...p, deviceInfo: navigator.userAgent.slice(0, 80) }),
    auth.deviceId,
    auth.username,
  ])

export const fetchReviewQueue = async (auth: AuthContext) =>
  arr<ReviewItem>((await callPositional('getPendingReviewQueue', [auth.deviceId, auth.username])).data)

export const reviewShift = (auth: AuthContext, p: { shiftId: string; checklistId: string; outlet: string }) =>
  callPositional<{ reviewedRows?: number }>('reviewChecklistShift', [JSON.stringify(p), auth.deviceId, auth.username])

/** Mirrors server _generateShiftId(): OUTLET(≤6)-CHECKLISTID(≤12)-YYYYMMDD. */
export const todayShiftId = (outlet: string, checklistId: string) => {
  const safe = (outlet || 'XX').replace(/\s+/g, '').toUpperCase().slice(0, 6)
  const d = localDate().replace(/-/g, '')
  const cid = (checklistId || 'DEFAULT').replace(/\s+/g, '').toUpperCase().slice(0, 12)
  return `${safe}-${cid}-${d}`
}
