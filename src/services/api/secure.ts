/**
 * Convenience wrapper over the RPC bridge for the common "*Secure(params)" shape:
 * one params object carrying `_authContext`. Unwraps the server's own
 * `{ success, ...payload }` object (sanitizeForClient) or apiOk envelope.
 */
import { rpc } from './rpc'
import type { AuthContext } from './types'

export interface SecureResult<T> {
  ok: boolean
  data: T | null
  error: string | null
}

const ENVELOPE_KEYS = new Set(['success', 'data', 'error', 'code'])

/**
 * The bridge returns one of:
 *  - an apiOk envelope `{success, data, error, code, ...flatCopyOfData}`
 *  - a legacy pass-through object `{success:true, orders, outlets, ...}` (no `data`)
 *  - a legacy `{success, data: [...]}` object
 * Normalise all three so callers always get the payload.
 */
function unwrap(res: Record<string, unknown>): unknown {
  if (res.data !== undefined && res.data !== null) return res.data
  const extra = Object.keys(res).filter((k) => !ENVELOPE_KEYS.has(k))
  if (!extra.length) return res.data ?? null
  const out: Record<string, unknown> = {}
  for (const k of extra) out[k] = res[k]
  return out
}

export async function callSecure<T = Record<string, unknown>>(
  fn: string,
  params: Record<string, unknown>,
  auth: AuthContext,
): Promise<SecureResult<T>> {
  const res = (await rpc<unknown>(fn, [{ ...params, _authContext: auth }])) as unknown as Record<string, unknown>
  if (!res.success) return { ok: false, data: null, error: String(res.error ?? 'Request failed') }
  return { ok: true, data: (unwrap(res) as T) ?? null, error: null }
}

/** For legacy functions that take positional args instead of a params object. */
export async function callPositional<T = unknown>(fn: string, args: unknown[]): Promise<SecureResult<T>> {
  const res = (await rpc<unknown>(fn, args)) as unknown as Record<string, unknown>
  if (!res.success) return { ok: false, data: null, error: String(res.error ?? 'Request failed') }
  return { ok: true, data: (unwrap(res) as T) ?? null, error: null }
}
