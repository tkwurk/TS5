import { useCallback, useEffect, useState } from 'react'
import type { AuthContext } from '@/services/api'
import { Badge, Button, DataTable, Field, FormRow, Notice, Panel, Select, Stats, SubTabs } from '@/components/ui'
import { useI18n } from '@/i18n'
import { fetchPnl, type PnlBundle } from '../reportsApi'

type View = 'monthly' | 'daily' | 'category'

/** Profit & Loss — mirrors ui_PNL.html (monthly / daily / by-category views of getPnLBundle). */
export function PnlPanel({ auth }: { auth: AuthContext }) {
  const { t, fmtMoney, fmtNum } = useI18n()
  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState(thisYear)
  const [view, setView] = useState<View>('monthly')
  const [bundle, setBundle] = useState<PnlBundle | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const r = await fetchPnl(year, auth)
    setLoading(false)
    if (r.error) setError(r.error)
    setBundle(r.data)
  }, [auth, year])

  useEffect(() => {
    load()
  }, [load])

  const monthly = bundle?.monthly ?? []
  const totals = monthly.reduce(
    (a, m) => ({ sales: a.sales + m.sales, purchases: a.purchases + m.purchases, expenses: a.expenses + m.expenses }),
    { sales: 0, purchases: 0, expenses: 0 },
  )
  const profit = totals.sales - totals.purchases - totals.expenses

  const money = (k: string) => (r: Record<string, unknown>) => fmtMoney(Number(r[k]) || 0)
  const profitCell = (r: Record<string, unknown>) => {
    const p = Number(r.profit) || 0
    return <Badge tone={p >= 0 ? 'ok' : 'bad'}>{fmtMoney(p)}</Badge>
  }

  return (
    <Panel title={`📈 ${t('nav.profitLoss')}`}>
      <FormRow>
        <Field label={t('pnl.year')}>
          <Select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[thisYear, thisYear - 1, thisYear - 2].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </Field>
        <div className="actions" style={{ alignSelf: 'end' }}>
          <Button variant="ghost" onClick={load} disabled={loading}>
            {loading ? t('common.loading') : '↻'}
          </Button>
        </div>
      </FormRow>
      {error && <Notice tone="error">{error}</Notice>}

      {bundle && (
        <Stats
          items={[
            { label: t('pnl.sales'), value: fmtMoney(totals.sales) },
            { label: t('pnl.purchases'), value: fmtMoney(totals.purchases) },
            { label: t('pnl.expenses'), value: fmtMoney(totals.expenses) },
            { label: t('pnl.profit'), value: fmtMoney(profit), tone: profit >= 0 ? 'ok' : 'bad' },
          ]}
        />
      )}

      <SubTabs
        tabs={[
          { id: 'monthly', label: t('pnl.monthly') },
          { id: 'daily', label: t('pnl.daily') },
          { id: 'category', label: t('pnl.byCategory') },
        ]}
        active={view}
        onChange={setView}
      />

      {view === 'monthly' && (
        <DataTable
          rows={monthly as unknown as Record<string, unknown>[]}
          rowKey={(r, i) => String(r.label ?? i)}
          empty={loading ? t('common.loading') : t('pnl.none')}
          columns={[
            { key: 'label', label: t('inv.month'), render: (r) => <>{String(r.label)}{r.isPartial ? <span className="muted"> ({t('pnl.partial')})</span> : null}</> },
            { key: 'sales', label: t('pnl.sales'), align: 'right', render: money('sales') },
            { key: 'purchases', label: t('pnl.purchases'), align: 'right', render: money('purchases') },
            { key: 'expenses', label: t('pnl.expenses'), align: 'right', render: money('expenses') },
            { key: 'profit', label: t('pnl.profit'), align: 'right', render: profitCell },
          ]}
        />
      )}
      {view === 'daily' && (
        <DataTable
          rows={[...(bundle?.daily ?? [])].reverse() as unknown as Record<string, unknown>[]}
          rowKey={(r, i) => String(r.date ?? i)}
          empty={loading ? t('common.loading') : t('pnl.none')}
          columns={[
            { key: 'date', label: t('kitchen.date') },
            { key: 'sales', label: t('pnl.sales'), align: 'right', render: money('sales') },
            { key: 'purchases', label: t('pnl.purchases'), align: 'right', render: money('purchases') },
            { key: 'expenses', label: t('pnl.expenses'), align: 'right', render: money('expenses') },
            { key: 'profit', label: t('pnl.profit'), align: 'right', render: profitCell },
          ]}
        />
      )}
      {view === 'category' && (
        <DataTable
          rows={(bundle?.category?.categories ?? []) as unknown as Record<string, unknown>[]}
          rowKey={(r) => String(r.category)}
          empty={loading ? t('common.loading') : t('pnl.none')}
          columns={[
            { key: 'category', label: t('inv.category') },
            { key: 'sales', label: t('pnl.sales'), align: 'right', render: money('sales') },
            { key: 'salesPct', label: '%', align: 'right', render: (r) => `${fmtNum(Number(r.salesPct) || 0)}%` },
            { key: 'purchases', label: t('pnl.purchases'), align: 'right', render: money('purchases') },
            { key: 'expenses', label: t('pnl.expenses'), align: 'right', render: money('expenses') },
            { key: 'profit', label: t('pnl.profit'), align: 'right', render: profitCell },
          ]}
        />
      )}
    </Panel>
  )
}
