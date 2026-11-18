/**
 * Catalog data access — talks to the backend only through the Seam 1 API client.
 * Never calls the Google Sheets API directly (see /AGENTS.md).
 */
import { api } from '@/services/api'
import type { ApiEnvelope, AuthContext } from '@/services/api'
import type { CatalogPipeline, CatalogResult } from './types'

const productsCache = new Map<string, Promise<ApiEnvelope<CatalogResult>>>()

export function clearProductsCache(): void {
  productsCache.clear()
}

/** Warm the product cache right after login. */
export function prefetchProducts(outlet?: string): void {
  void fetchProducts(outlet ? { outlet } : {})
}

/**
 * Fetch active products for an outlet (empty outlet = all). The catalog.requested
 * event runs through the Orchestrator, so the product list is nested under
 * steps.catalog.data — this unwraps it into a flat CatalogResult envelope.
 * Results are cached for the session; pass `force` (manual refresh) to reload.
 */
export function fetchProducts(
  opts: { outlet?: string; type?: string } = {},
  auth?: AuthContext,
  force = false,
): Promise<ApiEnvelope<CatalogResult>> {
  const key = `${opts.outlet ?? ''}|${opts.type ?? ''}`
  const hit = productsCache.get(key)
  if (hit && !force) return hit
  const promise = requestProducts(opts, auth)
  productsCache.set(key, promise)
  void promise.then((res) => {
    if (!res.success && productsCache.get(key) === promise) productsCache.delete(key)
  })
  return promise
}

async function requestProducts(
  opts: { outlet?: string; type?: string },
  auth?: AuthContext,
): Promise<ApiEnvelope<CatalogResult>> {
  const res = await api.products<CatalogPipeline>(opts, auth)
  if (!res.success) {
    return { success: false, data: null, error: res.error, code: res.code }
  }
  const data = res.data?.steps?.catalog?.data ?? { outlet: null, count: 0, products: [] }
  return { success: true, data, error: null, code: res.code }
}
