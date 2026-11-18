import { useCallback, useState } from 'react'
import { apiConfig } from '@/services/api'
import type { AuthContext } from '@/services/api'
import { Button, Notice, Panel } from '@/components/ui'
import { useI18n } from '@/i18n'
import { fetchSalesSummary } from '../api'
import { summaryOf, type SalesSummary } from '../types'

/**
 * Sales summary — reads the Orders sheet through the Reporting Worker's
 * Repo-backed path (Seam 2) via the Seam 1 API. Demonstrates the reporting port.
 */
export function ReportsPanel({ auth }: { auth?: AuthContext }) {
  const { t, fmtMoney, fmtNum } = useI18n()
  const configured = Boolean(apiConfig.appsScriptUrl)
  const [summary, setSummary] = useState<SalesSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetchSalesSummary(auth?.outlet ?? '', auth)
    setLoading(false)
    if (res.success) {
      setSummary(summaryOf(res.data) ?? null)
    } else {
      setError(res.error ?? 'Failed to load summary')
    }
  }, [auth])

  return (
    <Panel title={t('reports.title')}>
      <div className="actions">
        <Button onClick={load} disabled={!configured || loading}>
          {loading ? t('common.loading') : t('reports.load')}
        </Button>
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {summary && (
        <ul className="product-list">
          <li>
            {t('reports.outlet')}: {summary.outlet ?? t('common.all')}
          </li>
          <li>
            {t('reports.lines')}: {fmtNum(summary.lineCount)}
          </li>
          <li>
            {t('reports.totalSales')}: {fmtMoney(summary.totalSales)}
          </li>
          <li>
            {t('reports.itemsSold')}: {fmtNum(summary.totalQty)}
          </li>
          {Object.entries(summary.byPayment).map(([method, amount]) => (
            <li key={method}>
              {method}: {fmtMoney(amount)}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
