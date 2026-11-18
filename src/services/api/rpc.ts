/**
 * Generic RPC bridge (hybrid migration). Calls an EXISTING whitelisted Apps
 * Script function by name over HTTP — a drop-in replacement for the old
 * `google.script.run.<fn>(...args)` that works from a standalone PWA.
 *
 * Pass args exactly as the server function expects. For the `*Secure` functions,
 * that means a single params object including `_authContext`, e.g.:
 *   rpc('recordPurchaseSecure', [{ ...purchase, _authContext }])
 */
import { callApi } from './client'
import type { ApiEnvelope } from './types'

export function rpc<T = unknown>(fn: string, args: unknown[] = []): Promise<ApiEnvelope<T>> {
  return callApi<T>('rpc', { fn, args })
}
