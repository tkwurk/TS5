import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AuthContext } from '@/services/api'
import { Badge, Button, DataTable, Field, FormRow, Notice, Panel, Select, SubTabs, TextInput } from '@/components/ui'
import { useI18n } from '@/i18n'
import { fetchPaymentMethodsForModule, paymentIcon } from '@/features/checkout'
import type { PaymentMethod } from '@/features/checkout'
import { PurchasingHistoryPanel } from './PurchasingHistoryPanel'
import {
  fetchAllProducts,
  fetchExpenseAccounts,
  fetchOrderedPurchases,
  isActive,
  markReceived,
  outletMatches,
  recordPurchase,
  type Account,
  type BuyProduct,
  type OrderedPurchase,
  type PurchaseItem,
} from '../api'
import './purchasing.css'

export type PurchasingMode = 'normal' | 'local' | 'receive'
type Step = 'items' | 'payment'
type Msg = { tone: 'info' | 'error'; text: string }

const str = (v: unknown) => (v == null ? '' : String(v))
const num = (v: unknown) => Number(v) || 0

/**
 * Purchasing / Local buy / Receive — mirrors ui_purchasing.html + ui_purchasingLocal.html:
 * Buy-type products (MODE≠LO for normal; MODE L/LO + misc items for local), expense
 * account, qty/price per line (variable items adjustable), expiry date, payment
 * method (purchasing module) → recordPurchaseSecure. Receive lists ORDERED rows
 * and marks them RECEIVED with the received qty.
 */
export function PurchasingPanel({ auth, mode }: { auth: AuthContext; mode: PurchasingMode }) {
  const { t, fmtMoney, fmtNum } = useI18n()
  const [msg, setMsg] = useState<Msg | null>(null)
  const [tab, setTab] = useState<'buy' | 'history'>('buy')

  if (mode === 'receive') return <ReceivePanel auth={auth} />

  return (
    <>
      <SubTabs
        tabs={[
          { id: 'buy', label: t(mode === 'local' ? 'nav.purchasingLocal' : 'nav.purchasing') },
          { id: 'history', label: t('purch.history') },
        ]}
        active={tab}
        onChange={setTab}
      />
      <div hidden={tab !== 'buy'}>
        <BuyPanel auth={auth} local={mode === 'local'} msg={msg} setMsg={setMsg} t={t} fmtMoney={fmtMoney} fmtNum={fmtNum} />
      </div>
      {tab === 'history' && <PurchasingHistoryPanel auth={auth} local={mode === 'local'} />}
    </>
  )
}

function BuyPanel({
  auth,
  local,
  msg,
  setMsg,
  t,
  fmtMoney,
  fmtNum,
}: {
  auth: AuthContext
  local: boolean
  msg: Msg | null
  setMsg: (m: Msg | null) => void
  t: (k: string) => string
  fmtMoney: (n: number) => string
  fmtNum: (n: number) => string
}) {
  const [products, setProducts] = useState<BuyProduct[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [account, setAccount] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [cart, setCart] = useState<PurchaseItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [step, setStep] = useState<Step>('items')
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [miscName, setMiscName] = useState('')
  const [miscPrice, setMiscPrice] = useState('')
  const [miscQty, setMiscQty] = useState('1')
  const [miscCategory, setMiscCategory] = useState('')
  const [miscExpiry, setMiscExpiry] = useState('')
  const miscSequence = useRef(0)
  // Per-row typed values for variable-quantity items (Total / Unit price / Qty), as in the
  // original spreadsheet-style purchasing screen. The cart line is derived from these.
  const [draft, setDraft] = useState<Record<string, { total: string; price: string; qty: string; totalTyped?: boolean }>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setMsg(null)
    const [allRes, accs] = await Promise.all([fetchAllProducts(auth), fetchExpenseAccounts()])
    setLoading(false)
    if (allRes.error) setMsg({ tone: 'error', text: allRes.error })
    const buy = allRes.products.filter((p) => {
      if (!isActive(p) || str(p.TYPE) !== 'Buy') return false
      const m = str(p.MODE).trim().toUpperCase()
      const modeOk = local ? m === 'L' || m === 'LO' : m !== 'LO'
      return modeOk && outletMatches(str(p.OUTLET), auth.outlet ?? '')
    })
    setProducts(buy)
    setAccounts(accs)
    if (accs.length && !account) setAccount(accs[0].name)
  }, [auth, local, account])

  useEffect(() => {
    load()
  }, [load])

  const categories = useMemo(() => Array.from(new Set(products.map((p) => str(p.CATEGORY) || 'Other'))).sort(), [products])
  const query = search.trim().toLowerCase()
  const visible = useMemo(
    () =>
      products.filter((p) => {
        if (query) return str(p.NAME).toLowerCase().includes(query)
        return !category || (str(p.CATEGORY) || 'Other') === category
      }),
    [products, query, category],
  )

  const keyOf = (p: BuyProduct) => str(p.PRODUCTCODE) || `${str(p.CATEGORY)}::${str(p.NAME)}`
  const toItem = (p: BuyProduct): Omit<PurchaseItem, 'qty'> => ({
    key: keyOf(p),
    name: str(p.NAME),
    productName: str(p.NAME),
    code: str(p.PRODUCTCODE),
    category: str(p.CATEGORY),
    supplier: str(p.SUPPLIER),
    buyUnit: str(p.BUYUNIT),
    buyUnitSize: str(p.BUYUNITSIZE),
    price: num(p.BUYPRICE) || num(p.PRICE),
    mode: local ? str(p.MODE) || 'L' : str(p.MODE),
    isVariable: ['yes', 'y'].includes(str(p.QUANTITYVARIABLE).trim().toLowerCase()),
  })

  const lineOf = (key: string) => cart.find((c) => c.key === key)
  const setLine = (key: string, patch: Partial<PurchaseItem>, base?: Omit<PurchaseItem, 'qty'>) =>
    setCart((prev) => {
      const i = prev.findIndex((c) => c.key === key)
      if (i >= 0) {
        const next = [...prev]
        next[i] = { ...next[i], ...patch }
        return next.filter((c) => c.qty > 0)
      }
      if (!base) return prev
      const item = { ...base, qty: 0, ...patch } as PurchaseItem
      return item.qty > 0 ? [...prev, item] : prev
    })
  const clearCart = () => {
    setCart([])
    setDraft({})
  }
  const removeLine = (key: string) => {
    setLine(key, { qty: 0 })
    setDraft((d) => {
      const n = { ...d }
      delete n[key]
      return n
    })
  }

  // VOUCHER products are deductions from the supplier bill (stored as negative price), as in the original.
  const isVoucher = (name: string) => name.toUpperCase().includes('VOUCHER')
  const signed = (name: string, absPrice: number) => (isVoucher(name) ? -Math.abs(absPrice) : Math.abs(absPrice))

  /**
   * Variable-quantity row edit. Mirrors handleSpreadsheet{Total,Price,Qty}Change:
   *  - total typed  → price = total / qty (when qty > 0); total is now "user-entered"
   *  - qty typed    → if the user entered a total, price = total / qty; otherwise total = qty × price
   *  - price typed  → total = qty × price (total becomes derived again)
   */
  const editVariable = (base: Omit<PurchaseItem, 'qty'>, field: 'total' | 'price' | 'qty', value: string) => {
    const cur = draft[base.key] ?? { total: '', price: '', qty: '', totalTyped: false }
    const next = { ...cur, [field]: value }
    const qty = parseFloat(next.qty) || 0
    let price = Math.abs(parseFloat(next.price) || 0) || Math.abs(base.price)
    const total = parseFloat(next.total) || 0

    if (field === 'total') {
      next.totalTyped = total > 0
      if (total > 0 && qty > 0) {
        price = Math.round(total / qty)
        next.price = String(price)
      }
    } else if (field === 'qty') {
      if (next.totalTyped && total > 0 && qty > 0) {
        price = Math.round(total / qty)
        next.price = String(price)
      } else {
        next.total = qty > 0 && price > 0 ? String(Math.round(qty * price)) : ''
      }
    } else {
      next.totalTyped = false
      next.total = qty > 0 && price > 0 ? String(Math.round(qty * price)) : ''
    }

    setDraft((d) => ({ ...d, [base.key]: next }))
    setLine(base.key, { qty, price: signed(base.name, price) }, base)
  }

  const setRegularQty = (base: Omit<PurchaseItem, 'qty'>, qty: number) =>
    setLine(base.key, { qty: Math.max(0, qty), price: signed(base.name, base.price) }, base)

  const addMisc = () => {
    const name = miscName.trim()
    const price = Number(miscPrice)
    const qty = Number(miscQty)
    const category = miscCategory.trim()
    if (name.length < 2) return setMsg({ tone: 'error', text: t('custom.invalidName') })
    if (!Number.isFinite(price) || price <= 0) return setMsg({ tone: 'error', text: t('custom.invalidPrice') })
    if (!Number.isFinite(qty) || qty <= 0) return setMsg({ tone: 'error', text: t('purch.invalidMiscQty') })
    if (!category) return setMsg({ tone: 'error', text: t('purch.invalidMiscCategory') })
    const key = `misc::${++miscSequence.current}`
    setLine(key, { qty }, {
      key, name, productName: name, code: '', category, supplier: '', buyUnit: '', buyUnitSize: '', price,
      expiryDate: miscExpiry, mode: local ? 'L' : '', isMisc: true,
    })
    setMiscName('')
    setMiscPrice('')
    setMiscQty('1')
    setMiscCategory('')
    setMiscExpiry('')
    setMsg(null)
    setCartOpen(true)
  }

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0)

  const proceed = async () => {
    if (!account) return setMsg({ tone: 'error', text: t('purch.noAccount') })
    if (!cart.length) return setMsg({ tone: 'error', text: t('purch.noItems') })
    setMsg(null)
    setStep('payment')
    if (!methods.length) setMethods(await fetchPaymentMethodsForModule(auth, local ? 'localpurchasing' : 'purchasing'))
  }

  const pay = async (method: string) => {
    setSubmitting(true)
    const r = await recordPurchase({ items: cart, account, payment: method }, auth)
    setSubmitting(false)
    if (r.ok) {
      setMsg({ tone: 'info', text: `${t('purch.saved')} — ${fmtMoney(total)}` })
      clearCart()
      setStep('items')
    } else setMsg({ tone: 'error', text: r.error ?? '' })
  }

  return (
    <Panel title={local ? `🏪 ${t('nav.purchasingLocal')}` : `📦 ${t('nav.purchasing')}`}>
      {msg && <Notice tone={msg.tone === 'error' ? 'error' : 'info'}>{msg.text}</Notice>}

      {step === 'payment' ? (
        <div className="purch-pay">
          <div className="actions">
            <Button variant="ghost" onClick={() => setStep('items')} disabled={submitting}>
              ‹ {t('pay.back')}
            </Button>
            <strong>
              {t('checkout.total')}: {fmtMoney(total)} · {t('purch.account')}: {account}
            </strong>
          </div>
          <h4>💳 {t('pay.method')}</h4>
          {methods.length === 0 ? (
            <Notice tone="warn">{t('purch.noMethods')}</Notice>
          ) : (
            <div className="pay__methods">
              {methods.map((m) => (
                <button key={m.pn || m.name} type="button" className="pay__method" onClick={() => pay(m.name)} disabled={submitting}>
                  <span className="pay__method-icon">{paymentIcon(m.name)}</span>
                  <span>{m.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="purch">
          <div className="purch__main">
            <div className="purch__bar">
              <button
                type="button"
                className="cart-toggle"
                onClick={() => setCartOpen((o) => !o)}
                aria-expanded={cartOpen}
              >
                🧾 {t('purch.cart')} <Badge tone={cart.length ? 'ok' : 'neutral'}>{cart.length}</Badge>
              </button>
            </div>
            <FormRow>
              <Field label={t('purch.account')}>
                <Select value={account} onChange={(e) => setAccount(e.target.value)}>
                  {accounts.length === 0 && <option value="">—</option>}
                  {accounts.map((a) => (
                    <option key={a.name} value={a.name}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('checkout.search')}>
                <TextInput type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('checkout.search')} />
              </Field>
            </FormRow>

            {!query && (
              <div className="category-nav">
                <button type="button" className={'category-pill' + (!category ? ' category-pill--active' : '')} onClick={() => setCategory('')}>
                  {t('common.all')}
                </button>
                {categories.map((c) => (
                  <button key={c} type="button" className={'category-pill' + (category === c ? ' category-pill--active' : '')} onClick={() => setCategory(c)}>
                    {c}
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <p className="muted">{t('common.loading')}</p>
            ) : (
              <DataTable
                rows={visible as Record<string, unknown>[]}
                rowKey={(r) => keyOf(r as BuyProduct)}
                empty={t('purch.noProducts')}
                columns={[
                  {
                    key: 'NAME',
                    label: t('purch.product'),
                    render: (r) => (
                      <>
                        {str(r.NAME)}
                        {isVoucher(str(r.NAME)) && <Badge tone="bad">{t('purch.deduction')}</Badge>}
                        <div className="muted">
                          {str(r.SUPPLIER)} · {str(r.BUYUNIT)}
                          {r.BUYUNITSIZE ? ` ${str(r.BUYUNITSIZE)}` : ''}
                        </div>
                      </>
                    ),
                  },
                  {
                    key: 'total',
                    label: t('inv.total'),
                    align: 'right',
                    render: (r) => {
                      const base = toItem(r as BuyProduct)
                      const line = lineOf(base.key)
                      if (!base.isVariable) {
                        const tot = line ? line.qty * line.price : 0
                        return tot ? <span style={{ color: tot < 0 ? '#dc2626' : undefined, fontWeight: 600 }}>{fmtMoney(Math.abs(tot))}</span> : ''
                      }
                      return (
                        <input
                          className="ss-input"
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1000}
                          placeholder={t('purch.enterTotal')}
                          value={draft[base.key]?.total ?? (line ? String(Math.round(Math.abs(line.qty * line.price))) : '')}
                          onChange={(e) => editVariable(base, 'total', e.target.value)}
                        />
                      )
                    },
                  },
                  {
                    key: 'price',
                    label: t('purch.unitPrice'),
                    align: 'right',
                    render: (r) => {
                      const base = toItem(r as BuyProduct)
                      const line = lineOf(base.key)
                      if (!base.isVariable) return fmtMoney(Math.abs(base.price))
                      return (
                        <input
                          className="ss-input"
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          placeholder={String(Math.abs(base.price) || 0)}
                          value={draft[base.key]?.price ?? (line ? String(Math.abs(line.price)) : '')}
                          onChange={(e) => editVariable(base, 'price', e.target.value)}
                        />
                      )
                    },
                  },
                  {
                    key: 'qty',
                    label: t('purch.qty'),
                    align: 'right',
                    render: (r) => {
                      const base = toItem(r as BuyProduct)
                      const line = lineOf(base.key)
                      const qty = line?.qty ?? 0
                      if (base.isVariable) {
                        return (
                          <input
                            className="ss-input ss-input--qty"
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step={0.1}
                            placeholder="0"
                            value={draft[base.key]?.qty ?? (line ? String(line.qty) : '')}
                            onChange={(e) => editVariable(base, 'qty', e.target.value)}
                          />
                        )
                      }
                      return (
                        <span className="qty">
                          <button type="button" disabled={qty <= 0} onClick={() => setRegularQty(base, qty - 1)}>−</button>
                          <input
                            className="ss-input ss-input--qty"
                            type="number"
                            inputMode="numeric"
                            min={0}
                            step={1}
                            placeholder="0"
                            value={qty > 0 ? String(qty) : ''}
                            onChange={(e) => setRegularQty(base, parseFloat(e.target.value) || 0)}
                          />
                          <button type="button" onClick={() => setRegularQty(base, qty + 1)}>+</button>
                        </span>
                      )
                    },
                  },
                ]}
              />
            )}

              <form
                className="custom-item"
                onSubmit={(e) => {
                  e.preventDefault()
                  addMisc()
                }}
              >
                <h4 className="menu-cat">✏️ {t('purch.misc')}</h4>
                <FormRow>
                  <Field label={t('purch.miscDescription')}>
                    <TextInput value={miscName} onChange={(e) => setMiscName(e.target.value)} maxLength={50} required />
                  </Field>
                  <Field label={t('purch.miscCategory')}>
                    <TextInput value={miscCategory} onChange={(e) => setMiscCategory(e.target.value)} required />
                  </Field>
                  <Field label={t('purch.qty')}>
                    <TextInput type="number" inputMode="decimal" min="0.000001" step="any" value={miscQty} onChange={(e) => setMiscQty(e.target.value)} required />
                  </Field>
                  <Field label={t('purch.unitPrice')}>
                    <TextInput type="number" inputMode="decimal" min="0.000001" step="any" value={miscPrice} onChange={(e) => setMiscPrice(e.target.value)} required />
                  </Field>
                  <Field label={t('purch.expiry')}>
                    <TextInput type="date" value={miscExpiry} onChange={(e) => setMiscExpiry(e.target.value)} />
                  </Field>
                </FormRow>
                <Button type="submit">＋ {t('custom.add')}</Button>
              </form>
          </div>

          <aside className={'purch__cart' + (cartOpen ? '' : ' purch__cart--collapsed')}>
            <div className="purch__cart-head">
              <h3>
                🧾 {t('purch.cart')} <Badge tone={cart.length ? 'ok' : 'neutral'}>{cart.length}</Badge>
              </h3>
              <button type="button" className="cart-collapse" onClick={() => setCartOpen(false)} aria-label="Collapse">
                ›
              </button>
            </div>
            {cart.length === 0 ? (
              <p className="muted">{t('checkout.cartEmpty')}</p>
            ) : (
              <ul className="cart">
                {cart.map((c) => (
                  <li key={c.key} className="purch__line">
                    <span className="name">
                      {c.name}
                      <div className="muted">
                        {fmtNum(c.qty)} × {fmtMoney(c.price)}
                      </div>
                      {c.isMisc && <div className="muted">{c.category}</div>}
                      <input
                        type="date"
                        className="purch__expiry"
                        value={c.expiryDate ?? ''}
                        onChange={(e) => setLine(c.key, { expiryDate: e.target.value })}
                        title={t('purch.expiry')}
                      />
                    </span>
                    <span className="muted" style={{ color: c.price < 0 ? '#dc2626' : undefined }}>
                      {c.price < 0 ? '−' : ''}
                      {fmtMoney(Math.abs(c.price * c.qty))}
                    </span>
                    <button type="button" className="soldout-btn" onClick={() => removeLine(c.key)} aria-label="Remove">
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="checkout-total">
              <span>{t('checkout.total')}</span>
              <span>{fmtMoney(total)}</span>
            </div>
            <div className="actions">
              <Button onClick={proceed} disabled={!cart.length || !account}>
                💳 {t('checkout.proceed')}
              </Button>
              {cart.length > 0 && (
                <Button variant="ghost" onClick={clearCart}>
                  {t('checkout.clear')}
                </Button>
              )}
            </div>
          </aside>
        </div>
      )}
    </Panel>
  )
}

function ReceivePanel({ auth }: { auth: AuthContext }) {
  const { t, fmtNum } = useI18n()
  const [rows, setRows] = useState<OrderedPurchase[]>([])
  const [loading, setLoading] = useState(false)
  const [qty, setQty] = useState<Record<number, string>>({})
  const [msg, setMsg] = useState<Msg | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const list = await fetchOrderedPurchases(auth)
    setLoading(false)
    setRows(list)
    setQty(Object.fromEntries(list.map((r) => [r.rowIndex, String(r.qty)])))
  }, [auth])

  useEffect(() => {
    load()
  }, [load])

  const receive = async (r: OrderedPurchase) => {
    const q = Number(qty[r.rowIndex])
    if (isNaN(q) || q < 0) return setMsg({ tone: 'error', text: t('purch.invalidQty') })
    const res = await markReceived(r.rowIndex, q, auth)
    if (res.ok) {
      setMsg({ tone: 'info', text: `${t('purch.received')} — ${r.product}` })
      load()
    } else setMsg({ tone: 'error', text: res.error ?? '' })
  }

  return (
    <Panel title={`📥 ${t('nav.purchasingReceive')}`}>
      {msg && <Notice tone={msg.tone === 'error' ? 'error' : 'info'}>{msg.text}</Notice>}
      <div className="actions">
        <Button variant="ghost" onClick={load} disabled={loading}>
          {loading ? t('common.loading') : '↻'}
        </Button>
      </div>
      <DataTable
        rows={rows as unknown as Record<string, unknown>[]}
        rowKey={(r) => String(r.rowIndex)}
        empty={t('purch.nothingToReceive')}
        columns={[
          { key: 'date', label: t('kitchen.when') },
          { key: 'product', label: t('purch.product') },
          { key: 'supplier', label: t('purch.supplier') },
          { key: 'qty', label: t('purch.ordered'), align: 'right', render: (r) => fmtNum(Number(r.qty)) },
          {
            key: 'rquantity',
            label: t('purch.receivedQty'),
            align: 'right',
            render: (r) => (
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                style={{ width: '6rem', textAlign: 'right' }}
                value={qty[Number(r.rowIndex)] ?? ''}
                onChange={(e) => setQty((q) => ({ ...q, [Number(r.rowIndex)]: e.target.value }))}
              />
            ),
          },
          { key: 'act', label: '', render: (r) => <Button onClick={() => receive(r as unknown as OrderedPurchase)}>✅ {t('purch.markReceived')}</Button> },
        ]}
      />
    </Panel>
  )
}
