import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AuthContext } from '@/services/api'
import { Button, DataTable, Field, FormRow, Panel, Select, Stats, TextInput } from '@/components/ui'
import { useI18n } from '@/i18n'
import { fetchUsage, type UsageRow } from '../reportsApi'

/** Usage — mirrors ui_usageReport.html: monthly quantities sold per product/category. */
export function UsagePanel({ auth }: { auth: AuthContext }) {
  const { t, fmtNum } = useI18n()
  const [rows, setRows] = useState<UsageRow[]>([])
  const [loading, setLoading] = useState(false)
  const [month, setMonth] = useState('')
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetchUsage(auth)
    setLoading(false)
    setRows(data)
    if (!month && data.length) setMonth(data[0].month)
  }, [auth, month])

  useEffect(() => {
    load()
  }, [load])

  const months = useMemo(() => Array.from(new Set(rows.map((r) => r.month))).sort().reverse(), [rows])
  const categories = useMemo(() => Array.from(new Set(rows.map((r) => r.category))).sort(), [rows])
  const q = search.trim().toLowerCase()
  const visible = useMemo(
    () =>
      rows
        .filter((r) => (!month || r.month === month) && (!category || r.category === category) && (!q || r.name.toLowerCase().includes(q)))
        .sort((a, b) => b.qty - a.qty),
    [rows, month, category, q],
  )
  const totalQty = visible.reduce((s, r) => s + r.qty, 0)

  return (
    <Panel title={`📉 ${t('nav.usageReport')}`}>
      <FormRow>
        <Field label={t('inv.month')}>
          <Select value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">{t('common.all')}</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('inv.category')}>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">{t('common.all')}</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('checkout.search')}>
          <TextInput type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
        </Field>
        <div className="actions" style={{ alignSelf: 'end' }}>
          <Button variant="ghost" onClick={load} disabled={loading}>
            {loading ? t('common.loading') : '↻'}
          </Button>
        </div>
      </FormRow>
      <Stats items={[{ label: t('usage.products'), value: fmtNum(visible.length) }, { label: t('usage.totalQty'), value: fmtNum(totalQty) }]} />
      <DataTable
        rows={visible as unknown as Record<string, unknown>[]}
        rowKey={(r) => `${r.month}|${r.category}|${r.name}`}
        empty={loading ? t('common.loading') : t('usage.none')}
        columns={[
          { key: 'month', label: t('inv.month') },
          { key: 'category', label: t('inv.category') },
          { key: 'name', label: t('purch.product') },
          { key: 'qty', label: t('purch.qty'), align: 'right', render: (r) => fmtNum(Number(r.qty) || 0) },
        ]}
      />
    </Panel>
  )
}
