import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Button, DataTable, Field, FormRow, Notice, Panel, Select, Stats } from '@/components/ui'
import type { Column } from '@/components/ui/DataTable'
import type { AuthContext } from '@/services/api'
import { useI18n } from '@/i18n'
import { addDays, fmtDateOnly, fmtDateTime, localDateTime } from '@/lib/dates'
import { fetchPurchaseHistory, type PurchaseHistory, type PurchaseHistoryFilters, type PurchaseHistoryGrouping, type PurchaseHistoryRow } from '../api'

export function PurchasingHistoryPanel({ auth, local }: { auth: AuthContext; local: boolean }) {
  const { t, fmtMoney, fmtNum } = useI18n()
  const [groupBy, setGroupBy] = useState<PurchaseHistoryGrouping>('none')
  const [draftFilters, setDraftFilters] = useState<PurchaseHistoryFilters>({})
  const [filters, setFilters] = useState<PurchaseHistoryFilters>({})
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<{ key: string; data?: PurchaseHistory; error?: string } | null>(null)
  const requestKey = JSON.stringify([auth.username, auth.deviceId, auth.outlet, local, groupBy, revision])
  const current = result?.key === requestKey ? result : null
  const history = current?.data
  const error = current?.error
  const loading = !current

  useEffect(() => {
    let active = true
    fetchPurchaseHistory(auth, local, groupBy)
      .then((data) => { if (active) setResult({ key: requestKey, data }) })
      .catch((err: unknown) => {
        if (active) setResult({ key: requestKey, error: err instanceof Error ? err.message : String(err) })
      })
    return () => { active = false }
  }, [auth, local, groupBy, requestKey])

  const displayed = useMemo(() => {
    if (!history) return null
    const activeFilters = Object.entries(filters)
      .map(([key, value]) => [key, value.trim().toLowerCase()] as const)
      .filter(([, value]) => value)
    if (!activeFilters.length) return history

    const groups = history.groups.map((group) => {
      const rows = group.rows.filter((row) => activeFilters.every(([key, query]) => {
        const values = [String(row[key] ?? '')]
        if (key === 'date') {
          values.push(fmtDateTime(row.date))
          const date = new Date(row.date)
          if (!Number.isNaN(date.getTime())) {
            const [day, time] = localDateTime(date).split('T')
            const [year, month, dayOfMonth] = day.split('-')
            values.push(day, `${dayOfMonth}/${month}/${year}`, `${month}/${dayOfMonth}/${year}`, time)
          }
        } else if (key === 'pstatus') {
          if (row.pstatus.toUpperCase() === 'ORDERED') values.push('Ordered', 'Dipesan')
          if (row.pstatus.toUpperCase() === 'RECEIVED') values.push('Received', 'Diterima')
        } else if (key === 'qty' || key === 'rquantity') {
          values.push(fmtNum(Number(row[key])))
        } else if (key === 'price' || key === 'total') {
          values.push(fmtMoney(Number(row[key])))
        }
        return values.some((value) => value.toLowerCase().includes(query))
      }))
      return { ...group, rows, total: rows.reduce((sum, row) => sum + row.total, 0) }
    }).filter((group) => group.rows.length > 0)
    return {
      groups,
      count: groups.reduce((count, group) => count + group.rows.length, 0),
      total: groups.reduce((sum, group) => sum + group.total, 0),
    }
  }, [history, filters, fmtMoney, fmtNum])

  const columns: Column<PurchaseHistoryRow>[] = [
    { key: 'date', label: t('kitchen.when'), sortable: true, render: (r) => fmtDateTime(r.date),
      sortValue: (r) => new Date(r.date).getTime() || 0 },
    { key: 'product', label: t('purch.product'), sortable: true },
    { key: 'qty', label: t('purch.qty'), align: 'right', sortable: true, render: (r) => fmtNum(r.qty) },
    { key: 'unit', label: t('purch.unit'), sortable: true },
    { key: 'price', label: t('purch.unitPrice'), align: 'right', sortable: true, render: (r) => fmtMoney(r.price) },
    { key: 'total', label: t('checkout.total'), align: 'right', sortable: true, render: (r) => fmtMoney(r.total) },
    { key: 'payment', label: t('pay.method'), sortable: true },
    { key: 'username', label: t('purch.purchasedBy'), sortable: true },
    { key: 'pstatus', label: t('purch.status'), sortable: true,
      render: (r) => r.pstatus === 'ORDERED' ? t('purch.ordered') : r.pstatus === 'RECEIVED' ? t('purch.received') : r.pstatus },
    { key: 'rquantity', label: t('purch.receivedQty'), align: 'right', sortable: true, render: (r) => fmtNum(r.rquantity) },
  ]

  const columnFilters = {
    values: draftFilters,
    onChange: (key: string, value: string) => setDraftFilters((previous) => ({ ...previous, [key]: value })),
    label: (label: ReactNode) => `${t('purch.filterColumn')} ${String(label)}`,
  }
  const applyFilters = () => setFilters({ ...draftFilters })
  const clearFilters = () => {
    setDraftFilters({})
    setFilters({})
  }

  return (
    <Panel title={t('purch.history')}>
      <FormRow>
        <Field label={t('purch.groupBy')}>
          <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value as PurchaseHistoryGrouping)}>
            <option value="none">{t('purch.allPurchases')}</option>
            <option value="product">{t('purch.byProduct')}</option>
            <option value="week">{t('purch.byWeek')}</option>
          </Select>
        </Field>
      </FormRow>
      <div className="actions">
        <Button onClick={applyFilters} disabled={loading}>{t('purch.applyFilters')}</Button>
        <Button variant="ghost" onClick={clearFilters} disabled={loading}>{t('purch.clearFilters')}</Button>
        <Button variant="ghost" onClick={() => setRevision((n) => n + 1)} disabled={loading}>
          {t('purch.refresh')}
        </Button>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {loading && <p className="muted">{t('common.loading')}</p>}
      {displayed && (
        <>
          <Stats items={[
            { label: t('purch.historyLines'), value: fmtNum(displayed.count) },
            { label: t('checkout.total'), value: fmtMoney(displayed.total) },
          ]} />
          <p className="muted">{t('purch.filterHint')}</p>
          {!displayed.count && (
            <DataTable columns={columns} rows={[]} rowKey={(row) => String(row.rowIndex)}
              columnFilters={columnFilters} empty={t('purch.noMatchingHistory')} />
          )}
          {displayed.groups.map((group) => (
            <section key={`${groupBy}:${group.key}`} className="purch-history__group">
              {groupBy !== 'none' && (
                <h3>
                  {groupBy === 'product'
                    ? [group.product || t('purch.unknownProduct'), group.unit].filter(Boolean).join(' / ')
                    : group.weekStart
                      ? `${fmtDateOnly(group.weekStart)} - ${fmtDateOnly(addDays(group.weekStart, 6))}`
                      : t('purch.unknownWeek')}
                  {' - '}{fmtMoney(group.total)}
                </h3>
              )}
              <DataTable
                columns={columns}
                rows={group.rows}
                rowKey={(row) => String(row.rowIndex)}
                defaultSort={{ key: 'date', dir: 'desc' }}
                columnFilters={columnFilters}
                empty={t('purch.noHistory')}
              />
            </section>
          ))}
        </>
      )}
    </Panel>
  )
}
