import { useCallback, useState } from 'react'
import { apiConfig } from '@/services/api'
import type { AuthContext } from '@/services/api'
import { Button, Notice, Panel } from '@/components/ui'
import { useI18n } from '@/i18n'
import { fetchRecentOrders } from '../api'
import { ordersOf, type OrderLine } from '../types'

/** Recent orders — read through the Reporting Worker's Repo-backed path. */
export function OrdersPanel({ auth }: { auth?: AuthContext }) {
  const { t, fmtMoney } = useI18n()
  const configured = Boolean(apiConfig.appsScriptUrl)
  const [orders, setOrders] = useState<OrderLine[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetchRecentOrders(auth?.outlet ?? '', 25, auth)
    setLoading(false)
    if (res.success) setOrders(ordersOf(res.data))
    else setError(res.error ?? 'Failed to load orders')
  }, [auth])

  return (
    <Panel title={t('orders.title')}>
      <div className="actions">
        <Button onClick={load} disabled={!configured || loading}>
          {loading ? t('common.loading') : t('orders.load')}
        </Button>
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {orders.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('orders.col.order')}</th>
                <th>{t('orders.col.product')}</th>
                <th>{t('orders.col.qty')}</th>
                <th>{t('orders.col.total')}</th>
                <th>{t('orders.col.payment')}</th>
                <th>{t('orders.col.by')}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o, i) => (
                <tr key={i}>
                  <td>{o.orderNumber}</td>
                  <td>{o.product}</td>
                  <td>{o.qty}</td>
                  <td>{fmtMoney(Number(o.total))}</td>
                  <td>{o.payment}</td>
                  <td>{o.username}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}
