import { useCallback, useEffect, useMemo, useState } from 'react'
import { fmtDateTime, localDate } from '@/lib/dates'
import { callSecure } from '@/services/api'
import type { AuthContext } from '@/services/api'
import { Button, DataTable, Field, FormRow, Notice, Panel, Select, Stats, TextInput } from '@/components/ui'
import { useI18n } from '@/i18n'

interface AdminOrder {
  rowIndex: number
  timestamp: string
  outlet: string
  username: string
  itemName: string
  qty: number
  price: number
  total: number
  payment: string
  orderNumber: string
  category: string
  productCode: string
}
type Msg = { tone: 'info' | 'error'; text: string }
const today = () => localDate()

/**
 * Orders (admin) — mirrors the core of ui_adminOrders.html: list order lines by
 * date range/outlet, inline-edit qty/price (bulk save), delete a line.
 */
export function AdminOrdersPanel({ auth }: { auth: AuthContext }) {
  const { t, fmtMoney, fmtNum } = useI18n()
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [outlet, setOutlet] = useState(auth.outlet)
  const [outlets, setOutlets] = useState<string[]>([])
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [edits, setEdits] = useState<Record<number, { qty?: string; price?: string }>>({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<Msg | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setMsg(null)
    const r = await callSecure<{ orders: string | AdminOrder[] }>(
      'getOrdersForAdminSecure',
      { fromDate: from, toDate: to + 'T23:59:59', outlet, deviceId: auth.deviceId, username: auth.username },
      auth,
    )
    setLoading(false)
    if (!r.ok) return setMsg({ tone: 'error', text: r.error ?? '' })
    const raw = r.data?.orders
    const list = typeof raw === 'string' ? (JSON.parse(raw) as AdminOrder[]) : (raw ?? [])
    setOrders(list)
    setEdits({})
  }, [auth, from, to, outlet])

  useEffect(() => {
    callSecure<{ outlets?: string[] } | Array<string | { name: string }>>('getOutletsForAdminSecure', { deviceId: auth.deviceId, username: auth.username }, auth).then((r) => {
      const d = r.data
      const list = Array.isArray(d) ? d.map((o) => (typeof o === 'string' ? o : o.name)) : (d?.outlets ?? [])
      setOutlets(list.filter(Boolean))
    })
  }, [auth])
  useEffect(() => {
    load()
  }, [load])

  const q = search.trim().toLowerCase()
  const visible = useMemo(
    () => orders.filter((o) => !q || o.itemName.toLowerCase().includes(q) || o.orderNumber.toLowerCase().includes(q) || (o.username || '').toLowerCase().includes(q)),
    [orders, q],
  )
  const totalSales = visible.reduce((s, o) => s + (o.total || 0), 0)
  const dirty = Object.keys(edits).length

  const saveAll = async () => {
    const changes = Object.entries(edits).map(([row, e]) => {
      const o = orders.find((x) => x.rowIndex === Number(row))!
      const qty = e.qty !== undefined ? Number(e.qty) : o.qty
      const price = e.price !== undefined ? Number(e.price) : o.price
      return { rowIndex: Number(row), qty, price, total: qty * price }
    })
    setSaving(true)
    const r = await callSecure<{ updated?: number; errors?: string[] }>(
      'bulkUpdateOrdersSecure',
      { changes, deviceId: auth.deviceId, username: auth.username },
      auth,
    )
    setSaving(false)
    if (r.ok) {
      setMsg({ tone: 'info', text: `${t('adm.updated')}: ${r.data?.updated ?? changes.length}` })
      load()
    } else setMsg({ tone: 'error', text: r.error ?? '' })
  }

  const del = async (o: AdminOrder) => {
    if (!window.confirm(`${t('adm.confirmDelete')}\n${o.orderNumber} · ${o.itemName}`)) return
    const r = await callSecure('deleteOrderDataSecure', { rowIndex: o.rowIndex, deviceId: auth.deviceId, username: auth.username }, auth)
    if (r.ok) {
      setMsg({ tone: 'info', text: `${t('adm.deleted')} — ${o.orderNumber}` })
      load()
    } else setMsg({ tone: 'error', text: r.error ?? '' })
  }

  const numCell = (field: 'qty' | 'price') => (r: Record<string, unknown>) => {
    const row = Number(r.rowIndex)
    const v = edits[row]?.[field] ?? String(r[field] ?? '')
    return (
      <input
        type="number"
        inputMode="decimal"
        step="any"
        style={{ width: field === 'qty' ? '4.5rem' : '7rem', textAlign: 'right' }}
        value={v}
        onChange={(e) => setEdits((ed) => ({ ...ed, [row]: { ...ed[row], [field]: e.target.value } }))}
      />
    )
  }

  return (
    <Panel title={`📋 ${t('adm.orders')}`}>
      <FormRow>
        <Field label={t('kitchen.from')}>
          <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label={t('kitchen.to')}>
          <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field label={t('checkout.outlet')}>
          <Select value={outlet} onChange={(e) => setOutlet(e.target.value)}>
            <option value="">{t('common.all')}</option>
            {outlets.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('checkout.search')}>
          <TextInput type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
        </Field>
      </FormRow>
      <div className="actions">
        <Button onClick={load} disabled={loading}>
          {loading ? t('common.loading') : `🔍 ${t('adm.load')}`}
        </Button>
        {dirty > 0 && (
          <Button onClick={saveAll} disabled={saving}>
            {saving ? t('checkout.submitting') : `💾 ${t('adm.saveChanges')} (${dirty})`}
          </Button>
        )}
      </div>
      {msg && <Notice tone={msg.tone === 'error' ? 'error' : 'info'}>{msg.text}</Notice>}
      <Stats items={[{ label: t('sales.lines'), value: fmtNum(visible.length) }, { label: t('dep.totalSales'), value: fmtMoney(totalSales) }]} />
      <DataTable
        rows={visible as unknown as Record<string, unknown>[]}
        rowKey={(r) => String(r.rowIndex)}
        empty={loading ? t('common.loading') : t('sales.none')}
        columns={[
          { key: 'timestamp', label: t('kitchen.when'), render: (r) => fmtDateTime(r.timestamp) },
          { key: 'orderNumber', label: t('orders.col.order') },
          { key: 'itemName', label: t('purch.product') },
          { key: 'qty', label: t('purch.qty'), align: 'right', render: numCell('qty') },
          { key: 'price', label: t('purch.price'), align: 'right', render: numCell('price') },
          { key: 'total', label: t('inv.total'), align: 'right', render: (r) => fmtMoney(Number(r.total) || 0) },
          { key: 'payment', label: t('checkout.payment') },
          { key: 'username', label: t('kitchen.by') },
          { key: 'del', label: '', render: (r) => <button type="button" className="soldout-btn" onClick={() => del(r as unknown as AdminOrder)} aria-label="Delete">🗑️</button> },
        ]}
      />
    </Panel>
  )
}
