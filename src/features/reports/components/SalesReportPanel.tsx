import { useCallback, useEffect, useMemo, useState } from 'react'
import { addDays, fmtTimeOnly, localDate } from '@/lib/dates'
import type { AuthContext } from '@/services/api'
import { Button, DataTable, Field, FormRow, Notice, Panel, Stats, SubTabs, TextInput } from '@/components/ui'
import { useI18n } from '@/i18n'
import { fetchOrderLines, fetchSalesSummary, type OrderLine, type SalesSummary } from '../reportsApi'

type View = 'products' | 'lines'
const today = () => localDate()

/** Daily sales — mirrors ui_showSalesSummary.html / ui_index.html (getSalesSummaryByDate + getOrderLinesByDate). */
export function SalesReportPanel({ auth }: { auth: AuthContext }) {
  const { t, fmtMoney, fmtNum } = useI18n()
  const [date, setDate] = useState(today)
  const [view, setView] = useState<View>('products')
  const [summary, setSummary] = useState<SalesSummary | null>(null)
  const [lines, setLines] = useState<OrderLine[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [s, l] = await Promise.all([fetchSalesSummary(date, auth), fetchOrderLines(date, auth)])
    setLoading(false)
    if (!s) setError(t('sales.failed'))
    setSummary(s)
    setLines(l)
  }, [auth, date, t])

  useEffect(() => {
    load()
  }, [load])

  const products = useMemo(() => {
    const s = summary?.summary ?? {}
    const rows: { name: string; qty: number; total: number; category: string }[] = []
    for (const [category, items] of Object.entries(s)) {
      if (!items || typeof items !== 'object') continue
      for (const [key, rec] of Object.entries(items)) {
        const name =
          rec?.itemName || (key.includes('_') ? key.split('_').slice(1).join('_').replace(/_/g, ' ') : key)
        rows.push({ name, qty: Number(rec?.qty) || 0, total: Number(rec?.sales) || 0, category })
      }
    }
    return rows.sort((a, b) => b.total - a.total)
  }, [summary])

  const shift = (days: number) => setDate(addDays(date, days))

  return (
    <Panel title={`💹 ${t('nav.salesSummary')}`}>
      <FormRow>
        <Field label={t('kitchen.date')}>
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="actions" style={{ alignSelf: 'end' }}>
          <Button variant="ghost" onClick={() => shift(-1)}>‹</Button>
          <Button variant="ghost" onClick={() => setDate(today())}>{t('sales.today')}</Button>
          <Button variant="ghost" onClick={() => shift(1)}>›</Button>
          <Button variant="ghost" onClick={load} disabled={loading}>
            {loading ? t('common.loading') : '↻'}
          </Button>
        </div>
      </FormRow>
      {error && <Notice tone="error">{error}</Notice>}

      {summary && (
        <Stats
          items={[
            { label: t('dep.totalSales'), value: fmtMoney(summary.totalSales), tone: 'ok' },
            { label: t('sales.orders'), value: fmtNum(summary.ordersCount) },
            { label: t('dep.cashSales'), value: fmtMoney(summary.totalSalesByCash) },
            { label: t('dep.nonCashSales'), value: fmtMoney(summary.totalSalesByNonCash) },
            { label: t('dep.totalDeposits'), value: fmtMoney(summary.totalDeposits) },
            { label: t('sales.missed'), value: `${fmtNum(summary.missedOrdersCount)} · ${fmtMoney(summary.missedOrdersTotal)}`, tone: summary.missedOrdersCount ? 'bad' : undefined },
          ]}
        />
      )}

      <SubTabs
        tabs={[
          { id: 'products', label: t('sales.byProduct') },
          { id: 'lines', label: `${t('sales.lines')} (${lines.length})` },
        ]}
        active={view}
        onChange={setView}
      />

      {view === 'products' && (
        <DataTable
          rows={products as unknown as Record<string, unknown>[]}
          rowKey={(r) => `${r.category}:${r.name}`}
          empty={loading ? t('common.loading') : t('sales.none')}
          defaultSort={{ key: 'category', dir: 'asc' }}
          filterable
          filterPlaceholder={t('sales.filter')}
          columns={[
            { key: 'name', label: t('purch.product'), sortable: true },
            { key: 'category', label: t('inv.category'), sortable: true },
            { key: 'qty', label: t('purch.qty'), align: 'right', sortable: true, render: (r) => fmtNum(Number(r.qty) || 0) },
            { key: 'total', label: t('inv.total'), align: 'right', sortable: true, render: (r) => fmtMoney(Number(r.total) || 0) },
          ]}
        />
      )}
      {view === 'lines' && (
        <DataTable
          rows={lines as unknown as Record<string, unknown>[]}
          rowKey={(_, i) => String(i)}
          empty={loading ? t('common.loading') : t('sales.none')}
          defaultSort={{ key: 'time', dir: 'asc' }}
          filterable
          filterPlaceholder={t('sales.filter')}
          columns={[
            {
              key: 'time',
              label: t('kitchen.when'),
              sortable: true,
              sortValue: (r) => String(r.time ?? r.timestamp ?? ''),
              filterValue: (r) => fmtTimeOnly(r.time ?? r.timestamp),
              render: (r) => fmtTimeOnly(r.time ?? r.timestamp),
            },
            { key: 'orderNumber', label: t('orders.col.order'), sortable: true },
            {
              key: 'product',
              label: t('purch.product'),
              sortable: true,
              sortValue: (r) => String(r.productName ?? r.product ?? r.name ?? ''),
              filterValue: (r) => String(r.productName ?? r.product ?? r.name ?? ''),
              render: (r) => String(r.productName ?? r.product ?? r.name ?? ''),
            },
            { key: 'category', label: t('inv.category'), sortable: true },
            { key: 'qty', label: t('purch.qty'), align: 'right', sortable: true },
            {
              key: 'total',
              label: t('inv.total'),
              align: 'right',
              sortable: true,
              sortValue: (r) => Number(r.lineTotal ?? r.total) || 0,
              render: (r) => fmtMoney(Number(r.lineTotal ?? r.total) || 0),
            },
            { key: 'payment', label: t('checkout.payment'), sortable: true },
            { key: 'username', label: t('kitchen.by'), sortable: true },
          ]}
        />
      )}
    </Panel>
  )
}
