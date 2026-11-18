import type { Receipt } from './hooks/useLastReceipt'

/**
 * ESC/POS receipt builder + RawBT hand-off. Thermal printers cannot be driven
 * by a PWA directly; on Android the RawBT app receives raw ESC/POS bytes via a
 * `rawbt:base64,` link and sends them to the paired Bluetooth/USB/LAN printer.
 */

const ESC = 0x1b
const GS = 0x1d
const WIDTH_KEY = 'ts5.printerWidth'

/** Characters per line: 32 for 58mm printers (default for Bluetooth), 42/48 for 80mm. */
export function printerWidth(): number {
  const n = Number(localStorage.getItem(WIDTH_KEY))
  return n >= 24 && n <= 64 ? n : 32
}

export function setPrinterWidth(n: number): void {
  localStorage.setItem(WIDTH_KEY, String(n))
}

export const isAndroid = () => /android/i.test(navigator.userAgent)

/** ESC p m t1 t2 — pulse both drawer pins. */
export const DRAWER_KICK = [ESC, 0x70, 0x00, 0x32, 0xff, ESC, 0x70, 0x01, 0x32, 0xff]

const bytesOf = (s: string) =>
  Array.from(s.normalize('NFKD').replace(/[^\x20-\x7e]/g, '')).map((c) => c.charCodeAt(0))

const fmt = (n: number) => Math.round(n).toLocaleString('en-US')

function pair(left: string, right: string, width: number): string {
  const space = Math.max(1, width - left.length - right.length)
  return left.slice(0, Math.max(0, width - right.length - 1)) + ' '.repeat(space) + right
}

export function buildReceiptBytes(r: Receipt, labels: Record<string, string>): number[] {
  const w = printerWidth()
  const out: number[] = [ESC, 0x40]
  const text = (s: string) => out.push(...bytesOf(s), 0x0a)
  const align = (a: 0 | 1) => out.push(ESC, 0x61, a)
  const bold = (on: boolean) => out.push(ESC, 0x45, on ? 1 : 0)
  const rule = () => text('-'.repeat(w))

  align(1)
  bold(true)
  text(labels.title)
  bold(false)
  if (r.outlet) text(r.outlet)
  text(`${labels.order}: ${r.orderNumber}`)
  text(new Date(r.at).toLocaleString('en-GB', { timeZone: 'Asia/Jakarta' }))
  align(0)
  rule()
  for (const i of r.items) {
    text(i.name)
    text(pair(`  ${i.qty} x ${fmt(i.price)}`, fmt(i.price * i.qty), w))
  }
  rule()
  if ((r.discount ?? 0) > 0) {
    text(pair(labels.subtotal, fmt(r.subtotal ?? r.total + (r.discount ?? 0)), w))
    text(pair(labels.discount, '-' + fmt(r.discount ?? 0), w))
  }
  bold(true)
  text(pair(labels.total, fmt(r.total), w))
  bold(false)
  if (r.paymentSplits?.length) r.paymentSplits.forEach((s) => text(pair(s.method, fmt(s.amount), w)))
  else text(pair(labels.payment, r.payment, w))
  if (r.cashTendered !== undefined) {
    text(pair(labels.paid, fmt(r.cashTendered), w))
    text(pair(labels.change, fmt(r.changeAmount ?? 0), w))
  }
  rule()
  align(1)
  text(`${labels.operator}: ${r.operator}`)
  text(labels.thanks)
  out.push(0x0a, 0x0a, 0x0a, GS, 0x56, 0x42, 0x00)
  if (r.openCashDrawer) out.push(...DRAWER_KICK)
  return out
}

/** Hands raw bytes to the RawBT Android app. */
export function sendToRawBT(bytes: number[]): void {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  window.location.href = 'rawbt:base64,' + btoa(bin)
}
