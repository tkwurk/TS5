/**
 * Per-outlet printing preferences. Uses the SAME localStorage keys as the
 * original ui_orders.html (outletAutoPrint_<outlet>, snowbeeAutoPrint) so an
 * existing device keeps its setting when switching to the PWA.
 */
export function isAutoPrintEnabled(outlet: string): boolean {
  if (outlet) {
    const v = localStorage.getItem('outletAutoPrint_' + outlet)
    if (v === '1') return true
    if (v === '0') return false
  }
  // Default ON for the PWA (the original defaulted off until configured).
  const global = localStorage.getItem('snowbeeAutoPrint')
  return global === null ? true : global === '1'
}

export function setAutoPrintEnabled(outlet: string, on: boolean): void {
  if (outlet) localStorage.setItem('outletAutoPrint_' + outlet, on ? '1' : '0')
  else localStorage.setItem('snowbeeAutoPrint', on ? '1' : '0')
}
