import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AuthContext } from '@/services/api'
import { Button, DataTable, Field, FormRow, Notice, Panel, Select, Stats, SubTabs, TextInput } from '@/components/ui'
import { useI18n } from '@/i18n'
import { fetchPaymentMethodsForModule, paymentIcon } from '@/features/checkout'
import type { PaymentMethod } from '@/features/checkout'
import type { Account } from '@/features/purchasing'
import { fetchInvestmentAccounts, fetchInvestmentTransactions, recordInvestment, type InvestmentTx } from '../api'

type Tab = 'record' | 'report'
type Msg = { tone: 'info' | 'error'; text: string }

/** Investments tab — mirrors ui_showInvestmentReport.html (record + report). */
export function InvestmentsPanel({ auth }: { auth: AuthContext }) {
  const { t, fmtMoney, fmtNum } = useI18n()
  const [tab, setTab] = useState<Tab>('record')
  const [msg, setMsg] = useState<Msg | null>(null)

  const [accounts, setAccounts] = useState<Account[]>([])
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [account, setAccount] = useState('')
  const [detail, setDetail] = useState('')
  const [qty, setQty] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')
  const [method, setMethod] = useState('')
  const [saving, setSaving] = useState(false)

  const [txs, setTxs] = useState<InvestmentTx[]>([])
  const [loadingTx, setLoadingTx] = useState(false)
  const [group, setGroup] = useState<'account' | 'category' | 'month'>('account')

  const loadForm = useCallback(async () => {
    const [accs, ms] = await Promise.all([fetchInvestmentAccounts(), fetchPaymentMethodsForModule(auth, 'investment')])
    setAccounts(accs)
    setMethods(ms.length ? ms : await fetchPaymentMethodsForModule(auth, 'purchasing'))
    if (accs.length && !account) setAccount(accs[0].name)
  }, [auth, account])

  const loadTx = useCallback(async () => {
    setLoadingTx(true)
    setTxs(await fetchInvestmentTransactions())
    setLoadingTx(false)
  }, [])

  useEffect(() => {
    loadForm()
    loadTx()
  }, [loadForm, loadTx])

  const total = (Number(qty) || 0) * (Number(unitPrice) || 0)

  const submit = async () => {
    if (!account) return setMsg({ tone: 'error', text: t('inv.noAccount') })
    if (detail.trim().length < 2) return setMsg({ tone: 'error', text: t('inv.noDetail') })
    if (!(Number(qty) > 0) || !(Number(unitPrice) > 0)) return setMsg({ tone: 'error', text: t('inv.invalid') })
    if (!method) return setMsg({ tone: 'error', text: t('purch.noMethods') })
    setSaving(true)
    const r = await recordInvestment({ detail: detail.trim(), qty: Number(qty), unitPrice: Number(unitPrice), account, payment: method }, auth)
    setSaving(false)
    if (r.ok) {
      setMsg({ tone: 'info', text: `${t('inv.saved')} — ${fmtMoney(total)}` })
      setDetail('')
      setQty('1')
      setUnitPrice('')
      loadTx()
    } else setMsg({ tone: 'error', text: r.error ?? '' })
  }

  const grouped = useMemo(() => {
    const map = new Map<string, number>()
    for (const tx of txs) {
      const k = group === 'account' ? tx.account || '—' : group === 'category' ? tx.category || '—' : (tx.date || '').slice(0, 7) || '—'
      map.set(k, (map.get(k) ?? 0) + (tx.total || 0))
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [txs, group])
  const grandTotal = txs.reduce((s, x) => s + (x.total || 0), 0)

  return (
    <Panel title={`💎 ${t('nav.investments')}`}>
      <SubTabs
        tabs={[
          { id: 'record', label: `➕ ${t('inv.record')}` },
          { id: 'report', label: `📊 ${t('inv.report')}` },
        ]}
        active={tab}
        onChange={setTab}
      />
      {msg && <Notice tone={msg.tone === 'error' ? 'error' : 'info'}>{msg.text}</Notice>}

      {tab === 'record' && (
        <>
          <FormRow>
            <Field label={t('dep.account')}>
              <Select value={account} onChange={(e) => setAccount(e.target.value)}>
                {accounts.length === 0 && <option value="">—</option>}
                {accounts.map((a) => (
                  <option key={a.name} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('inv.detail')}>
              <TextInput value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={80} />
            </Field>
            <Field label={t('purch.qty')}>
              <TextInput type="number" inputMode="decimal" min={0} step="any" value={qty} onChange={(e) => setQty(e.target.value)} />
            </Field>
            <Field label={t('inv.unitPrice')}>
              <TextInput type="number" inputMode="numeric" min={0} step={1000} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
            </Field>
          </FormRow>
          <h4 className="muted">💳 {t('pay.method')}</h4>
          <div className="pay__methods">
            {methods.map((m) => (
              <button key={m.pn || m.name} type="button" className={'pay__method' + (method === m.name ? ' pay__method--active' : '')} onClick={() => setMethod(m.name)}>
                <span className="pay__method-icon">{paymentIcon(m.name)}</span>
                <span>{m.name}</span>
              </button>
            ))}
          </div>
          <div className="checkout-total">
            <span>{t('checkout.total')}</span>
            <span>{fmtMoney(total)}</span>
          </div>
          <div className="actions">
            <Button onClick={submit} disabled={saving}>
              {saving ? t('checkout.submitting') : `💾 ${t('inv.record')}`}
            </Button>
          </div>
        </>
      )}

      {tab === 'report' && (
        <>
          <div className="actions">
            <SubTabs
              tabs={[
                { id: 'account', label: t('dep.account') },
                { id: 'category', label: t('inv.category') },
                { id: 'month', label: t('inv.month') },
              ]}
              active={group}
              onChange={setGroup}
            />
            <Button variant="ghost" onClick={loadTx} disabled={loadingTx}>
              {loadingTx ? t('common.loading') : '↻'}
            </Button>
          </div>
          <Stats items={[{ label: t('inv.total'), value: fmtMoney(grandTotal) }, { label: t('inv.count'), value: fmtNum(txs.length) }]} />
          <DataTable
            rows={grouped.map(([k, v]) => ({ k, v }))}
            rowKey={(r) => String(r.k)}
            empty={t('inv.none')}
            columns={[
              { key: 'k', label: t('inv.group') },
              { key: 'v', label: t('inv.total'), align: 'right', render: (r) => fmtMoney(Number(r.v)) },
            ]}
          />
          <h4 className="muted">{t('inv.transactions')}</h4>
          <DataTable
            rows={txs as unknown as Record<string, unknown>[]}
            rowKey={(_, i) => String(i)}
            empty={t('inv.none')}
            columns={[
              { key: 'date', label: t('kitchen.date') },
              { key: 'product', label: t('inv.detail') },
              { key: 'account', label: t('dep.account') },
              { key: 'qty', label: t('purch.qty'), align: 'right' },
              { key: 'total', label: t('inv.total'), align: 'right', render: (r) => fmtMoney(Number(r.total) || 0) },
            ]}
          />
        </>
      )}
    </Panel>
  )
}
