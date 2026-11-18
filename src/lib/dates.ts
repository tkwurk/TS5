/**
 * Business-timezone date helpers.
 *
 * The outlet (and the Apps Script project) run in BUSINESS_TZ. A device in a
 * different zone must still see and submit the outlet's "today" and wall-clock
 * time, otherwise reports split across days and submitted times drift.
 * Never use Date#toISOString().slice(0,10) or device-local getters for business dates.
 */
export const BUSINESS_TZ: string = (import.meta.env.VITE_BUSINESS_TZ as string | undefined) || 'Asia/Jakarta'

const pad = (n: number) => String(n).padStart(2, '0')

interface Parts {
  y: number
  m: number
  d: number
  hh: number
  mm: number
}
const partsFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
function tzParts(d: Date): Parts {
  const p: Record<string, number> = {}
  for (const x of partsFmt.formatToParts(d)) if (x.type !== 'literal') p[x.type] = Number(x.value)
  return { y: p.year, m: p.month, d: p.day, hh: p.hour === 24 ? 0 : p.hour, mm: p.minute }
}

/** YYYY-MM-DD for the given instant, in the business timezone. */
export function localDate(d: Date = new Date()): string {
  const p = tzParts(d)
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`
}

/** YYYY-MM-DDTHH:mm business wall-clock time, for datetime-local inputs sent to the server. */
export function localDateTime(d: Date = new Date()): string {
  const p = tzParts(d)
  return `${localDate(d)}T${pad(p.hh)}:${pad(p.mm)}`
}

/** Shift a YYYY-MM-DD string by N days (pure calendar arithmetic, timezone-agnostic). */
export function addDays(date: string, days: number): string {
  const [y, m, dd] = date.split('-').map(Number)
  const u = new Date(Date.UTC(y, (m || 1) - 1, (dd || 1) + days))
  return `${u.getUTCFullYear()}-${pad(u.getUTCMonth() + 1)}-${pad(u.getUTCDate())}`
}

const dtFmt = new Intl.DateTimeFormat(undefined, {
  timeZone: BUSINESS_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})
const dFmt = new Intl.DateTimeFormat(undefined, { timeZone: BUSINESS_TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const tFmt = new Intl.DateTimeFormat(undefined, { timeZone: BUSINESS_TZ, hour: '2-digit', minute: '2-digit' })

const asDate = (v: unknown): Date | null => {
  if (v == null || v === '') return null
  const d = v instanceof Date ? v : new Date(String(v))
  return isNaN(d.getTime()) ? null : d
}
/** Display helpers — always render instants in the business timezone. */
export const fmtDateTime = (v: unknown): string => {
  const d = asDate(v)
  return d ? dtFmt.format(d) : v == null ? '' : String(v)
}
export const fmtDateOnly = (v: unknown): string => {
  const d = asDate(v)
  return d ? dFmt.format(d) : v == null ? '' : String(v)
}
export const fmtTimeOnly = (v: unknown): string => {
  const d = asDate(v)
  return d ? tFmt.format(d) : v == null ? '' : String(v)
}
