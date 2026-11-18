import { useCallback, useEffect, useState } from 'react'
import { Badge, Button, Notice } from '@/components/ui'
import { useI18n } from '@/i18n'
import type { AuthContext } from '@/services/api'
import { fetchRecookAlerts, type RecookItem } from '../api'
import './recook.css'

const REFRESH_MS = 60_000

/**
 * Kitchen recook alerts on the ordering screen — mirrors toggleRecookAlertPanel()
 * + fetchRecookAlerts(): shows cooked products at/below their recook threshold,
 * refreshed periodically and after each order.
 */
export function useRecookAlerts(auth: AuthContext, enabled: boolean) {
  const [alerts, setAlerts] = useState<RecookItem[]>([])
  const [items, setItems] = useState<RecookItem[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    const res = await fetchRecookAlerts(auth)
    setLoading(false)
    if (!res) {
      setFailed(true)
      return
    }
    setFailed(false)
    setItems(res.items)
    setAlerts(res.alerts)
  }, [auth])

  useEffect(() => {
    if (!enabled) return
    refresh()
    const id = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(id)
  }, [enabled, refresh])

  return { alerts, items, loading, failed, refresh }
}

export function RecookPanel({
  alerts,
  items,
  loading,
  failed,
  onRefresh,
  onClose,
}: {
  alerts: RecookItem[]
  items: RecookItem[]
  loading: boolean
  failed: boolean
  onRefresh: () => void
  onClose: () => void
}) {
  const { t, fmtNum } = useI18n()
  const rest = items.filter((i) => !i.needsRecook)

  return (
    <div className="recook">
      <div className="recook__head">
        <h4>
          👨‍🍳 {t('recook.title')} <Badge tone={alerts.length ? 'bad' : 'ok'}>{alerts.length}</Badge>
        </h4>
        <div className="actions">
          <Button variant="ghost" onClick={onRefresh} disabled={loading}>
            {loading ? t('common.loading') : '↻'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            ✕
          </Button>
        </div>
      </div>

      {failed && <Notice tone="warn">{t('recook.failed')}</Notice>}
      {!failed && items.length === 0 && !loading && <p className="muted">{t('recook.none')}</p>}

      {alerts.length > 0 && (
        <ul className="recook__list recook__list--alert">
          {alerts.map((a) => (
            <li key={a.productCode ?? a.name}>
              <span className="name">🔥 {a.name}</span>
              <span className="recook__nums">
                {fmtNum(a.remaining)} / {fmtNum(a.recookThreshold)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {rest.length > 0 && (
        <details className="recook__rest">
          <summary className="muted">
            {t('recook.ok')} ({rest.length})
          </summary>
          <ul className="recook__list">
            {rest.map((a) => (
              <li key={a.productCode ?? a.name}>
                <span className="name">{a.name}</span>
                <span className="recook__nums">
                  {fmtNum(a.remaining)} / {fmtNum(a.recookThreshold)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
