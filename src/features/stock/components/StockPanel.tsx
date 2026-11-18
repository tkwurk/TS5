import { useCallback, useEffect, useMemo, useState } from 'react'
import { fmtDateOnly } from '@/lib/dates'
import { callSecure } from '@/services/api'
import type { AuthContext } from '@/services/api'
import { Badge, Button, DataTable, Field, FormRow, Notice, Panel, Stats, TextInput } from '@/components/ui'
import { useI18n } from '@/i18n'

interface StockItem {
  productCode: string
  name: string
  unit: string
  category: string
  purchased: number
  consumed: number
  sold: number
  remaining: number
}
interface StockResult {
  outlet: string
  items: StockItem[]
  stockSource: string
  historyAsOfDate: string
  todayDate: string
  historyIncomplete: boolean
}

const fmtDate = (v: string) => (v ? fmtDateOnly(v) : '—')

/** Stock — current ledger totals (purchased − consumed − sold) per buy product for the outlet. */
export function StockPanel({ auth }: { auth: AuthContext }) {
  const { t, fmtNum } = useI18n()
  const [data, setData] = useState<StockResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [lowOnly, setLowOnly] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const r = await callSecure<StockResult>('getStockTotalsSecure', { outlet: auth.outlet }, auth)
    setLoading(false)
    if (!r.ok) return setError(r.error)
    const d = r.data as unknown as { items?: StockItem[] } & StockResult
    setData(d?.items ? d : null)
  }, [auth])

  useEffect(() => {
    load()
  }, [load])

  const q = search.trim().toLowerCase()
  const items = useMemo(
    () =>
      (data?.items ?? []).filter(
        (i) => (!q || i.name.toLowerCase().includes(q) || i.productCode.toLowerCase().includes(q)) && (!lowOnly || i.remaining <= 0),
      ),
    [data, q, lowOnly],
  )
  const low = (data?.items ?? []).filter((i) => i.remaining <= 0).length

  return (
    <Panel title={`📊 ${t('nav.stockReport')}`}>
      <FormRow>
        <Field label={t('checkout.search')}>
          <TextInput type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
        </Field>
        <label className="ui-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', alignSelf: 'end' }}>
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> {t('stock.lowOnly')}
        </label>
        <div className="actions" style={{ alignSelf: 'end' }}>
          <Button variant="ghost" onClick={load} disabled={loading}>
            {loading ? t('common.loading') : '↻'}
          </Button>
        </div>
      </FormRow>
      {error && <Notice tone="error">{error}</Notice>}
      {data?.historyIncomplete && <Notice tone="warn">{t('stock.historyIncomplete')}</Notice>}
      {data && (
        <Stats
          items={[
            { label: t('stock.products'), value: fmtNum(data.items.length) },
            { label: t('stock.outOfStock'), value: fmtNum(low), tone: low ? 'bad' : 'ok' },
            { label: t('stock.asOf'), value: fmtDate(data.historyAsOfDate || data.todayDate) },
          ]}
        />
      )}
      <DataTable
        rows={items as unknown as Record<string, unknown>[]}
        rowKey={(r) => String(r.productCode)}
        empty={loading ? t('common.loading') : t('stock.none')}
        columns={[
          { key: 'name', label: t('purch.product'), render: (r) => <>{String(r.name)}<div className="muted">{String(r.category)} · {String(r.unit)}</div></> },
          { key: 'purchased', label: t('stock.purchased'), align: 'right', render: (r) => fmtNum(Number(r.purchased)) },
          { key: 'consumed', label: t('stock.consumed'), align: 'right', render: (r) => fmtNum(Number(r.consumed)) },
          { key: 'sold', label: t('kitchen.sold'), align: 'right', render: (r) => fmtNum(Number(r.sold)) },
          {
            key: 'remaining',
            label: t('kitchen.remaining'),
            align: 'right',
            render: (r) => <Badge tone={Number(r.remaining) <= 0 ? 'bad' : 'ok'}>{fmtNum(Number(r.remaining))}</Badge>,
          },
        ]}
      />
    </Panel>
  )
}
