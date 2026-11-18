/** Catalog feature types. Products are header-keyed rows from the Products sheet. */
export type ProductRow = Record<string, unknown>

export interface CatalogResult {
  outlet: string | null
  count: number
  products: ProductRow[]
}

/** The catalog.requested pipeline wraps the catalog step's result under steps.catalog. */
export interface CatalogPipeline {
  steps?: {
    catalog?: {
      data?: CatalogResult
    }
  }
}

/** Best-effort display name from a header-keyed product row. */
export function productName(row: ProductRow): string {
  const keys = Object.keys(row)
  const match = keys.find((k) => /product ?name|^name$|item/i.test(k))
  const value = match ? row[match] : undefined
  return value != null && value !== '' ? String(value) : '(unnamed)'
}
