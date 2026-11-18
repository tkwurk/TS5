import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AuthContext } from '@/services/api'
import { Badge, Button, DataTable, Field, FormRow, Notice, Panel, Select, Stats, TextInput } from '@/components/ui'
import { useI18n } from '@/i18n'
import { fetchAdminProducts, saveProduct, updateProductFields, yn, type AdminProduct, type ProductsBundle } from '../api'

type Msg = { tone: 'info' | 'error'; text: string }
type View = 'browse' | 'create'
const s = (v: unknown) => (v == null ? '' : String(v))

/** Mirrors ui_adminOrders.html "Products" pane: browse/edit (name, price, active) and create Sell/Buy products. */
export function ProductsAdmin({ auth }: { auth: AuthContext }) {
  const { t, fmtMoney } = useI18n()
  const [view, setView] = useState<View>('browse')
  const [bundle, setBundle] = useState<ProductsBundle>({ products: [], categories: [], navCategories: [], suppliers: [] })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<Msg | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setBundle(await fetchAdminProducts(auth))
    setLoading(false)
  }, [auth])
  useEffect(() => {
    load()
  }, [load])

  return (
    <Panel title={`📦 ${t('adm.products')}`}>
      <div className="actions">
        <Button variant={view === 'browse' ? 'primary' : 'ghost'} onClick={() => setView('browse')}>
          {t('adm.browse')}
        </Button>
        <Button variant={view === 'create' ? 'primary' : 'ghost'} onClick={() => setView('create')}>
          {t('adm.create')}
        </Button>
        <Button variant="ghost" onClick={load} disabled={loading}>
          {loading ? t('common.loading') : '↻'}
        </Button>
      </div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {view === 'browse' ? (
        <Browse auth={auth} products={bundle.products} onChanged={load} setMsg={setMsg} fmtMoney={fmtMoney} t={t} />
      ) : (
        <Create
          auth={auth}
          bundle={bundle}
          t={t}
          setMsg={setMsg}
          onSaved={() => {
            load()
            setView('browse')
          }}
        />
      )}
    </Panel>
  )
}

function Browse({
  auth,
  products,
  onChanged,
  setMsg,
  fmtMoney,
  t,
}: {
  auth: AuthContext
  products: AdminProduct[]
  onChanged: () => void
  setMsg: (m: Msg | null) => void
  fmtMoney: (n: number) => string
  t: (k: string) => string
}) {
  const [type, setType] = useState<'Sell' | 'Buy'>('Sell')
  const [q, setQ] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [edit, setEdit] = useState<Record<string, { name: string; price: string }>>({})

  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase()
    return products.filter(
      (p) =>
        s(p.TYPE) === type &&
        (showInactive || yn(p.ACTIVE) || s(p.ACTIVE) === '') &&
        (!ql || s(p.NAME).toLowerCase().includes(ql) || s(p.PRODUCTCODE).toLowerCase().includes(ql) || s(p.CATEGORY).toLowerCase().includes(ql)),
    )
  }, [products, type, q, showInactive])

  const save = async (p: AdminProduct) => {
    const code = s(p.PRODUCTCODE)
    const e = edit[code]
    if (!e) return
    const r = await updateProductFields({ productCode: code, type, name: e.name, price: e.price }, auth)
    if (r.ok) {
      setMsg({ tone: 'info', text: `${t('adm.updated')} — ${e.name}` })
      setEdit((x) => {
        const n = { ...x }
        delete n[code]
        return n
      })
      onChanged()
    } else setMsg({ tone: 'error', text: r.error ?? '' })
  }
  const toggleActive = async (p: AdminProduct) => {
    const code = s(p.PRODUCTCODE)
    const next = yn(p.ACTIVE) || s(p.ACTIVE) === '' ? 'N' : 'Y'
    const r = await updateProductFields({ productCode: code, type, active: next }, auth)
    if (r.ok) onChanged()
    else setMsg({ tone: 'error', text: r.error ?? '' })
  }

  return (
    <>
      <FormRow>
        <Field label={t('adm.type')}>
          <Select value={type} onChange={(e) => setType(e.target.value as 'Sell' | 'Buy')}>
            <option value="Sell">Sell</option>
            <option value="Buy">Buy</option>
          </Select>
        </Field>
        <Field label={t('checkout.search')}>
          <TextInput type="search" value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
        <label className="ui-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', alignSelf: 'end' }}>
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> {t('adm.showInactive')}
        </label>
      </FormRow>
      <Stats items={[{ label: t('stock.products'), value: rows.length }]} />
      <DataTable
        rows={rows}
        rowKey={(r) => s(r.PRODUCTCODE) || s(r.NAME)}
        empty={t('purch.noProducts')}
        columns={[
          { key: 'PRODUCTCODE', label: t('adm.code'), render: (r) => <code>{s(r.PRODUCTCODE)}</code> },
          {
            key: 'NAME',
            label: t('purch.product'),
            render: (r) => {
              const code = s(r.PRODUCTCODE)
              return (
                <input
                  style={{ minWidth: '12rem' }}
                  value={edit[code]?.name ?? s(r.NAME)}
                  onChange={(e) => setEdit((x) => ({ ...x, [code]: { name: e.target.value, price: x[code]?.price ?? s(type === 'Sell' ? r.PRICE : r.BUYPRICE) } }))}
                />
              )
            },
          },
          { key: 'CATEGORY', label: t('inv.category'), render: (r) => <>{s(r.CATEGORY)}<div className="muted">{s(r.NAVCATEGORY)}</div></> },
          { key: 'SUPPLIER', label: t('purch.supplier') },
          {
            key: 'PRICE',
            label: t('purch.price'),
            align: 'right',
            render: (r) => {
              const code = s(r.PRODUCTCODE)
              const base = s(type === 'Sell' ? r.PRICE : r.BUYPRICE)
              return (
                <input
                  type="number"
                  inputMode="decimal"
                  style={{ width: '7rem', textAlign: 'right' }}
                  value={edit[code]?.price ?? base}
                  onChange={(e) => setEdit((x) => ({ ...x, [code]: { name: x[code]?.name ?? s(r.NAME), price: e.target.value } }))}
                />
              )
            },
          },
          { key: 'OUTLET', label: t('checkout.outlet') },
          {
            key: 'ACTIVE',
            label: t('adm.active'),
            render: (r) => (
              <button type="button" className="soldout-btn" onClick={() => toggleActive(r)} title={t('adm.toggleActive')}>
                <Badge tone={yn(r.ACTIVE) || s(r.ACTIVE) === '' ? 'ok' : 'bad'}>{yn(r.ACTIVE) || s(r.ACTIVE) === '' ? 'Y' : 'N'}</Badge>
              </button>
            ),
          },
          {
            key: 'save',
            label: '',
            render: (r) =>
              edit[s(r.PRODUCTCODE)] ? (
                <Button onClick={() => save(r)}>💾</Button>
              ) : (
                <span className="muted">{type === 'Sell' ? fmtMoney(Number(r.PRICE) || 0) : fmtMoney(Number(r.BUYPRICE) || 0)}</span>
              ),
          },
        ]}
      />
    </>
  )
}

const slug = (v: string) =>
  v
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)

function Create({
  auth,
  bundle,
  t,
  setMsg,
  onSaved,
}: {
  auth: AuthContext
  bundle: ProductsBundle
  t: (k: string) => string
  setMsg: (m: Msg | null) => void
  onSaved: () => void
}) {
  const [f, setF] = useState<Record<string, string>>({
    TYPE: 'Sell',
    NAME: '',
    CATEGORY: '',
    NAVCATEGORY: '',
    SUPPLIER: '',
    OUTLET: auth.outlet ?? '',
    PRICE: '',
    BUYPRICE: '',
    PRODUCTCODE: '',
    SELLUNIT: '',
    BUYUNIT: '',
    'BUYUNIT SIZE': '',
    UNITSFORSELLING: '',
    MODE: '',
    QUANTITYVARIABLE: 'no',
    IMAGEFILEID: '',
    PARENTPRODUCTCODE: '',
    'UNITSPERPARENT ': '',
    'SORT ORDER': '',
    COOKING_PRODUCT: 'N',
    RECOOK_THRESHOLD: '',
    FRESH_HOURS: '',
    ACTIVE: 'Y',
  })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }))
  const sell = f.TYPE === 'Sell'
  const code = f.PRODUCTCODE || (f.NAME ? `${slug(f.CATEGORY || f.TYPE)}_${slug(f.NAME)}` : '')
  const buyProducts = bundle.products.filter((p) => s(p.TYPE) === 'Buy' && (yn(p.ACTIVE) || s(p.ACTIVE) === ''))

  const submit = async () => {
    if (!f.NAME.trim() || !f.CATEGORY.trim()) return setMsg({ tone: 'error', text: t('adm.needNameCategory') })
    setSaving(true)
    const product: Record<string, string> = { ...f, PRODUCTCODE: code }
    if (sell) {
      product.BUYPRICE = ''
      product.BUYUNIT = ''
      product['BUYUNIT SIZE'] = ''
    } else {
      product.PRICE = ''
      product.SELLUNIT = ''
      product.UNITSFORSELLING = ''
      product.NAVCATEGORY = ''
      product.QUANTITYVARIABLE = ''
    }
    const r = await saveProduct(product, auth)
    setSaving(false)
    if (r.ok) {
      setMsg({ tone: 'info', text: `${t('adm.productCreated')} — ${code}` })
      onSaved()
    } else setMsg({ tone: 'error', text: r.error ?? '' })
  }

  const datalist = (id: string, opts: string[]) => (
    <datalist id={id}>
      {opts.map((o) => (
        <option key={o} value={o} />
      ))}
    </datalist>
  )

  return (
    <div className="ui-form">
      <FormRow>
        <Field label={t('adm.type')}>
          <Select value={f.TYPE} onChange={(e) => set('TYPE', e.target.value)}>
            <option value="Sell">Sell</option>
            <option value="Buy">Buy</option>
          </Select>
        </Field>
        <Field label={t('kitchen.product')}>
          <TextInput value={f.NAME} onChange={(e) => set('NAME', e.target.value)} />
        </Field>
        <Field label={t('adm.code')}>
          <TextInput value={code} onChange={(e) => set('PRODUCTCODE', slug(e.target.value))} placeholder="AUTO" />
        </Field>
      </FormRow>
      <FormRow>
        <Field label={t('inv.category')}>
          <TextInput list="adm-cat" value={f.CATEGORY} onChange={(e) => set('CATEGORY', e.target.value)} />
          {datalist('adm-cat', bundle.categories)}
        </Field>
        {sell && (
          <Field label={t('adm.navCategory')}>
            <TextInput list="adm-nav" value={f.NAVCATEGORY} onChange={(e) => set('NAVCATEGORY', e.target.value)} />
            {datalist('adm-nav', bundle.navCategories)}
          </Field>
        )}
        <Field label={t('purch.supplier')}>
          <TextInput list="adm-sup" value={f.SUPPLIER} onChange={(e) => set('SUPPLIER', e.target.value)} />
          {datalist('adm-sup', bundle.suppliers)}
        </Field>
        <Field label={t('checkout.outlet')}>
          <TextInput value={f.OUTLET} onChange={(e) => set('OUTLET', e.target.value)} placeholder="ALL" />
        </Field>
      </FormRow>
      {sell ? (
        <FormRow>
          <Field label={t('purch.price')}>
            <TextInput type="number" inputMode="decimal" value={f.PRICE} onChange={(e) => set('PRICE', e.target.value)} />
          </Field>
          <Field label={t('adm.sellUnit')}>
            <TextInput value={f.SELLUNIT} onChange={(e) => set('SELLUNIT', e.target.value)} />
          </Field>
          <Field label={t('adm.unitsForSelling')}>
            <TextInput type="number" value={f.UNITSFORSELLING} onChange={(e) => set('UNITSFORSELLING', e.target.value)} />
          </Field>
          <Field label={t('adm.variableQty')}>
            <Select value={f.QUANTITYVARIABLE} onChange={(e) => set('QUANTITYVARIABLE', e.target.value)}>
              <option value="no">no</option>
              <option value="yes">yes</option>
            </Select>
          </Field>
        </FormRow>
      ) : (
        <FormRow>
          <Field label={t('adm.buyPrice')}>
            <TextInput type="number" inputMode="decimal" value={f.BUYPRICE} onChange={(e) => set('BUYPRICE', e.target.value)} />
          </Field>
          <Field label={t('adm.buyUnit')}>
            <TextInput value={f.BUYUNIT} onChange={(e) => set('BUYUNIT', e.target.value)} />
          </Field>
          <Field label={t('adm.buyUnitSize')}>
            <TextInput type="number" value={f['BUYUNIT SIZE']} onChange={(e) => set('BUYUNIT SIZE', e.target.value)} />
          </Field>
          <Field label={t('adm.mode')}>
            <Select value={f.MODE} onChange={(e) => set('MODE', e.target.value)}>
              <option value="">—</option>
              <option value="L">L (local)</option>
              <option value="LO">LO (local only)</option>
              <option value="O">O (ordered)</option>
            </Select>
          </Field>
        </FormRow>
      )}
      <FormRow>
        <Field label={t('adm.parentProduct')}>
          <Select value={f.PARENTPRODUCTCODE} onChange={(e) => set('PARENTPRODUCTCODE', e.target.value)}>
            <option value="">—</option>
            {buyProducts.map((p) => (
              <option key={s(p.PRODUCTCODE)} value={s(p.PRODUCTCODE)}>
                {s(p.NAME)} ({s(p.PRODUCTCODE)})
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('adm.unitsPerParent')}>
          <TextInput type="number" value={f['UNITSPERPARENT ']} onChange={(e) => set('UNITSPERPARENT ', e.target.value)} />
        </Field>
        <Field label={t('adm.sortOrder')}>
          <TextInput type="number" value={f['SORT ORDER']} onChange={(e) => set('SORT ORDER', e.target.value)} />
        </Field>
        <Field label={t('adm.imageFileId')}>
          <TextInput value={f.IMAGEFILEID} onChange={(e) => set('IMAGEFILEID', e.target.value)} />
        </Field>
      </FormRow>
      {sell && (
        <FormRow>
          <Field label={t('adm.cookingProduct')}>
            <Select value={f.COOKING_PRODUCT} onChange={(e) => set('COOKING_PRODUCT', e.target.value)}>
              <option value="N">N</option>
              <option value="Y">Y</option>
            </Select>
          </Field>
          <Field label={t('adm.recookThreshold')}>
            <TextInput type="number" value={f.RECOOK_THRESHOLD} onChange={(e) => set('RECOOK_THRESHOLD', e.target.value)} />
          </Field>
          <Field label={t('adm.freshHours')}>
            <TextInput type="number" value={f.FRESH_HOURS} onChange={(e) => set('FRESH_HOURS', e.target.value)} />
          </Field>
        </FormRow>
      )}
      <div className="actions">
        <Button onClick={submit} disabled={saving}>
          {saving ? t('checkout.submitting') : `➕ ${t('adm.createProduct')}`}
        </Button>
      </div>
    </div>
  )
}
