import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AuthContext } from '@/services/api'
import { fmtDateOnly } from '@/lib/dates'
import { Badge, Button, DataTable, Field, FormRow, Notice, Panel, Stats, SubTabs, TextInput } from '@/components/ui'
import { useI18n } from '@/i18n'
import { getDailyClosingBundle, recordConsumption, type DailyClosingBundle } from '../api'

type Tab = 'entry' | 'summary'
type Msg = { tone: 'info' | 'error'; text: string }

/**
 * Consumption tab — mirrors ui_inventoryConsumption.html: daily closing bundle
 * (buy products + auto-prefill from today's sales + today's summary), operator
 * enters/adjusts consumed quantities per product and saves.
 */
export function ConsumptionPanel({ auth }: { auth: AuthContext }) {
  const { t, fmtNum } = useI18n()
  const [tab, setTab] = useState<Tab>('entry')
  const [bundle, setBundle] = useState<DailyClosingBundle | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [qty, setQty] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState<Msg | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await getDailyClosingBundle(auth)
    setLoading(false)
    if (!r.ok || !r.data) return setMsg({ tone: 'error', text: r.error ?? t('cons.loadFailed') })
    setBundle(r.data)
    // Prefill from today's sales-derived consumption (same as the original).
    const pre: Record<string, string> = {}
    for (const i of r.data.autoPrefill?.items ?? []) if (i.quantity > 0) pre[i.productCode] = String(i.quantity)
    setQty(pre)
  }, [auth, t])

  useEffect(() => {
    load()
  }, [load])

  const products = bundle?.products ?? []
  const query = search.trim().toLowerCase()
  const visible = useMemo(
    () => (query ? products.filter((p) => p.name.toLowerCase().includes(query) || p.productCode.toLowerCase().includes(query)) : products),
    [products, query],
  )
  const items = useMemo(
    () =>
      Object.entries(qty)
        .map(([productCode, v]) => ({ productCode, quantity: Number(v) || 0 }))
        .filter((i) => i.quantity > 0),
    [qty],
  )

  const save = async () => {
    if (!items.length) return setMsg({ tone: 'error', text: t('cons.noItems') })
    setSaving(true)
    const r = await recordConsumption(items, auth)
    setSaving(false)
    if (r.ok) {
      setMsg({ tone: 'info', text: r.data?.message ?? t('cons.saved') })
      setQty({})
      load()
    } else setMsg({ tone: 'error', text: r.error ?? '' })
  }

  const summary = bundle?.summary
  const kf = bundle?.keyfigures
  const [kfSearch, setKfSearch] = useState('')
  const [kfLowOnly, setKfLowOnly] = useState(false)
  const kfItems = kf?.items ?? []
  const kfLow = kfItems.filter((i) => (Number(i.remaining) || 0) <= 0).length
  const kfVisible = useMemo(() => {
    const q = kfSearch.trim().toLowerCase()
    return kfItems.filter(
      (i) =>
        (!q || i.name.toLowerCase().includes(q) || i.productCode.toLowerCase().includes(q) || (i.category ?? '').toLowerCase().includes(q)) &&
        (!kfLowOnly || (Number(i.remaining) || 0) <= (Number(i.reorderQty) || 0)),
    )
  }, [kfItems, kfSearch, kfLowOnly])

  return (
    <Panel title={`🧮 ${t('nav.inventoryConsumption')}`}>
      <SubTabs
        tabs={[
          { id: 'entry', label: `✏️ ${t('cons.entry')}` },
          { id: 'summary', label: `📊 ${t('cons.today')}` },
        ]}
        active={tab}
        onChange={setTab}
      />
      {msg && <Notice tone={msg.tone === 'error' ? 'error' : 'info'}>{msg.text}</Notice>}

      {tab === 'entry' && (
        <>
          <div className="actions">
            <Field label={t('checkout.search')}>
              <TextInput type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
            </Field>
            <Button variant="ghost" onClick={load} disabled={loading}>
              {loading ? t('common.loading') : '↻'}
            </Button>
          </div>
          {bundle?.autoPrefill?.totalItems ? (
            <Notice tone="info">
              {t('cons.prefilled')}: {fmtNum(bundle.autoPrefill.totalItems)} ({bundle.autoPrefill.date})
            </Notice>
          ) : null}
          <DataTable
            rows={visible as unknown as Record<string, unknown>[]}
            rowKey={(r) => String(r.productCode)}
            empty={loading ? t('common.loading') : t('cons.noProducts')}
            columns={[
              { key: 'name', label: t('purch.product'), render: (r) => <>{String(r.name)}<div className="muted">{String(r.category ?? '')} · {String(r.unit ?? '')}</div></> },
              {
                key: 'qty',
                label: t('cons.consumed'),
                align: 'right',
                render: (r) => (
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    style={{ width: '6rem', textAlign: 'right' }}
                    value={qty[String(r.productCode)] ?? ''}
                    onChange={(e) => setQty((q) => ({ ...q, [String(r.productCode)]: e.target.value }))}
                    placeholder="0"
                  />
                ),
              },
            ]}
          />
          <div className="actions">
            <Button onClick={save} disabled={saving || !items.length}>
              {saving ? t('checkout.submitting') : `💾 ${t('cons.save')} (${items.length})`}
            </Button>
          </div>
        </>
      )}

      {tab === 'summary' && (
        <>
          {kf && (
            <Stats
              items={[
                { label: t('stock.products'), value: fmtNum(kfItems.length) },
                { label: t('stock.outOfStock'), value: fmtNum(kfLow), tone: kfLow ? 'bad' : 'ok' },
                { label: t('cons.recordedToday'), value: fmtNum(summary?.totalQuantity ?? 0) },
                { label: t('stock.asOf'), value: kf.historyAsOfDate ? fmtDateOnly(kf.historyAsOfDate) : kf.stockSource || '—' },
              ]}
            />
          )}
          {kf?.needsBootstrap && <Notice tone="warn">{t('stock.historyIncomplete')}</Notice>}
          <FormRow>
            <Field label={t('checkout.search')}>
              <TextInput type="search" value={kfSearch} onChange={(e) => setKfSearch(e.target.value)} />
            </Field>
            <label className="ui-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', alignSelf: 'end' }}>
              <input type="checkbox" checked={kfLowOnly} onChange={(e) => setKfLowOnly(e.target.checked)} /> {t('cons.lowOnly')}
            </label>
            <div className="actions" style={{ alignSelf: 'end' }}>
              <Button variant="ghost" onClick={load} disabled={loading}>
                {loading ? t('common.loading') : '↻'}
              </Button>
            </div>
          </FormRow>
          <DataTable
            rows={kfVisible as unknown as Record<string, unknown>[]}
            rowKey={(r) => String(r.productCode)}
            empty={loading ? t('common.loading') : t('cons.noSummary')}
            columns={[
              {
                key: 'name',
                label: t('purch.product'),
                render: (r) => (
                  <>
                    {String(r.name)}
                    <div className="muted">
                      {String(r.category ?? '')}
                      {r.unit ? ` · ${String(r.unit)}` : ''}
                      {r.supplier ? ` · ${String(r.supplier)}` : ''}
                    </div>
                  </>
                ),
              },
              { key: 'totalPurchased', label: t('stock.purchased'), align: 'right', render: (r) => fmtNum(Number(r.totalPurchased) || 0) },
              { key: 'totalConsumed', label: t('stock.consumed'), align: 'right', render: (r) => fmtNum(Number(r.totalConsumed) || 0) },
              { key: 'totalSold', label: t('kitchen.sold'), align: 'right', render: (r) => fmtNum(Number(r.totalSold) || 0) },
              {
                key: 'remaining',
                label: t('kitchen.remaining'),
                align: 'right',
                render: (r) => {
                  const rem = Number(r.remaining) || 0
                  const reorder = Number(r.reorderQty) || 0
                  return <Badge tone={rem <= 0 ? 'bad' : reorder && rem <= reorder ? 'neutral' : 'ok'}>{fmtNum(rem)}</Badge>
                },
              },
              { key: 'reorderQty', label: t('cons.reorderAt'), align: 'right', render: (r) => (Number(r.reorderQty) ? fmtNum(Number(r.reorderQty)) : '—') },
            ]}
          />

          {summary && summary.items.length > 0 && (
            <>
              <h4 className="muted">📝 {t('cons.recordedToday')}</h4>
              <DataTable
                rows={summary.items as Record<string, unknown>[]}
                rowKey={(r, i) => `${r.productCode ?? i}`}
                columns={[
                  { key: 'name', label: t('purch.product'), render: (r) => String(r.name ?? r.productCode ?? '') },
                  { key: 'unit', label: t('cons.unit') },
                  { key: 'quantity', label: t('cons.consumed'), align: 'right', render: (r) => fmtNum(Number(r.quantity) || 0) },
                ]}
              />
            </>
          )}
        </>
      )}
    </Panel>
  )
}
