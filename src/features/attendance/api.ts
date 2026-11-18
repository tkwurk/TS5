import { callPositional } from '@/services/api'
import type { AuthContext } from '@/services/api'

export interface Employee {
  employee_id: string
  name: string
  department?: string
  position?: string
}
export interface AttendanceRow {
  employee_id: string
  date: string
  start_time: string
  end_time: string
  work_hours: string | number
  status: string
}

export async function fetchEmployees(auth: AuthContext): Promise<Employee[]> {
  const r = await callPositional<unknown>('getEmployeeList', [auth.deviceId, auth.username])
  return Array.isArray(r.data) ? (r.data as Employee[]) : []
}
export async function fetchAttendanceForDate(date: string): Promise<AttendanceRow[]> {
  const r = await callPositional<unknown>('getAttendanceForDate', [date])
  return Array.isArray(r.data) ? (r.data as AttendanceRow[]) : []
}
export async function fetchAttendanceSummary(start: string, end: string): Promise<AttendanceRow[]> {
  const r = await callPositional<unknown>('getAttendanceSummary', [start, end])
  return Array.isArray(r.data) ? (r.data as AttendanceRow[]) : []
}
export const recordMorning = (date: string, supervisor: string, entries: { employee_id: string; start_time: string; status?: string }[]) =>
  callPositional<{ recorded?: number; skipped?: number }>('recordMorningAttendance', [JSON.stringify({ date, supervisor, entries })])
export const recordEvening = (date: string, supervisor: string, entries: { employee_id: string; end_time: string; status?: string }[]) =>
  callPositional<{ updated?: number }>('recordEveningAttendance', [JSON.stringify({ date, supervisor, entries })])
