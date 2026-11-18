import { useMemo, useState } from 'react'
import { Button, Notice } from '@/components/ui'
import { useI18n } from '@/i18n'
import type { CartItem, DiscountMode, PaymentDecision, PaymentMethod, PaymentSplit } from '../types'
import { computeDiscount, isCashLike, isFreeMethod, paymentIcon, resolveOpenCashDrawer } from '../types'
import './payment.css'

type Mode = 'single' | 'split'
type Stage = 'choose' | 'cash'

const QUICK_CASH = [50000, 100000]

/**
 * Payment step shown after "Submit order" — mirrors the original ui_checkout.html
 * + ui_splitPayment.html: choose a method, optional discount (amount or %), or a
 * split payment; cash (or the cash leg of a split) goes through a cash-tendered
 * screen that computes change. Split is not allowed together with a discount.
 */
export function PaymentScreen({
  items,
  methods,
  loadingMethods,
  methodsError,
  submitting,
  onConfirm,
  onBack,
}: {
  items: CartItem[]
  methods: PaymentMethod[]
  loadingMethods: boolean
  methodsError?: string | null
  submitting: boolean
  onConfirm: (decision: PaymentDecision) => void
  onBack: () => void
}) {
  const { t, fmtMoney } = useI18n()
  const subtotal = useMemo(() => items.reduce((s, i) => s + i.price * i.qty, 0), [items])

  const [mode, setMode] = useState<Mode>('single')
  const [stage, setStage] = useState<Stage>('choose')
  const [discountMode, setDiscountMode] = useState<DiscountMode>('amount')
  const [discountInput, setDiscountInput] = useState('')
  const [selectedName, setSelected] = useState<string>('')
  const [splits, setSplits] = useState<Record<string, string>>({})
  const [tenderedInput, setTenderedInput] = useState('')

  // Only fall back to cash/card when the list could not be loaded at all.
  const available = useMemo<PaymentMethod[]>(
    () =>
      methods.length || !methodsError
        ? methods
        : [
            { pn: 'cash', name: 'cash', destinationAccount: '', status: 'active', outlet: '', module: '' },
            { pn: 'card', name: 'card', destinationAccount: '', status: 'active', outlet: '', module: '' },
          ],
    [methods, methodsError],
  )

  // Derive the active method: explicit selection, else the first available.
  const selected = available.some((m) => m.name === selectedName) ? selectedName : (available[0]?.name ?? '')

  const selectedMethod = available.find((m) => m.name === selected)
  const isFree = Boolean(selectedMethod && isFreeMethod(selectedMethod.name))

  // "Free" overrides any entered discount: the whole order is the discount.
  const discountValue = isFree ? subtotal : parseFloat(discountInput) || 0
  const effectiveMode: DiscountMode = isFree ? 'amount' : discountMode
  const discount = isFree ? Math.round(subtotal) : computeDiscount(subtotal, discountMode, discountValue)
  const total = subtotal - discount
  const hasDiscount = discount > 0

  const splitLines: PaymentSplit[] = useMemo(
    () =>
      available
        .map((m) => ({ method: m.name, amount: Number(splits[m.name]) || 0, destinationAccount: m.destinationAccount, autoDeposit: m.autoDeposit }))
        .filter((s) => s.amount > 0),
    [available, splits],
  )
  const splitSum = splitLines.reduce((s, l) => s + l.amount, 0)
  const splitRemaining = subtotal - splitSum
  const splitValid = splitLines.length >= 2 && splitRemaining === 0
  const splitCashPortion = splitLines.filter((s) => isCashLike(s.method)).reduce((a, s) => a + s.amount, 0)

  const canConfirm = mode === 'single' ? Boolean(selectedMethod) && total >= 0 : splitValid

  // Cash-tendered stage: the amount that must be covered by cash.
  const cashDue = mode === 'split' ? splitCashPortion : total
  const tendered = parseFloat(tenderedInput) || 0
  const change = tendered - cashDue
  const tenderedOk = tendered >= cashDue

  const buildDecision = (cash?: { tendered: number; change: number }): PaymentDecision => {
    if (mode === 'split') {
      // Record the full sale under cash (server rule for split orders); legs carry the detail.
      return {
        payment: 'cash',
        discountMode,
        discountValue: 0,
        discount: 0,
        subtotal,
        total: subtotal,
        paymentSplits: splitLines,
        cashTendered: cash?.tendered,
        changeAmount: cash?.change,
        openCashDrawer: resolveOpenCashDrawer('cash', subtotal, splitLines, available),
      }
    }
    const m = selectedMethod!
    return {
      payment: m.name,
      destinationAccount: m.destinationAccount || undefined,
      autoDeposit: m.autoDeposit,
      discountMode: effectiveMode,
      discountValue,
      discount,
      subtotal,
      total,
      cashTendered: cash?.tendered,
      changeAmount: cash?.change,
      openCashDrawer: resolveOpenCashDrawer(m.name, total, undefined, available),
    }
  }

  // Mirrors selectPayment(): cash (or a split with a cash leg) → cash-tendered screen first.
  const confirm = () => {
    if (!canConfirm) return
    const needsCash = mode === 'split' ? splitCashPortion > 0 : Boolean(selectedMethod && isCashLike(selectedMethod.name) && total > 0)
    if (needsCash) {
      setTenderedInput('')
      setStage('cash')
      return
    }
    onConfirm(buildDecision())
  }

  const confirmCash = () => {
    if (!tenderedOk) return
    onConfirm(buildDecision({ tendered, change }))
  }

  const fillRemaining = (name: string) => {
    const others = splitLines.filter((s) => s.method !== name).reduce((s, l) => s + l.amount, 0)
    setSplits((prev) => ({ ...prev, [name]: String(Math.max(0, subtotal - others)) }))
  }

  if (stage === 'cash') {
    return (
      <div className="pay">
        <div className="pay__head">
          <Button variant="ghost" onClick={() => setStage('choose')} disabled={submitting}>
            ‹ {t('pay.back')}
          </Button>
          <h3>💵 {t('pay.cashTitle')}</h3>
        </div>

        <div className="pay__summary">
          {mode === 'split' && (
            <div>
              <span>{t('pay.cashPortion')}</span>
              <span>{fmtMoney(splitCashPortion)}</span>
            </div>
          )}
          <div className="pay__total">
            <span>{t('pay.amountDue')}</span>
            <span>{fmtMoney(cashDue)}</span>
          </div>
        </div>

        <section className="pay__section">
          <h4>{t('pay.tendered')}</h4>
          <input
            className="pay__tendered"
            type="number"
            inputMode="numeric"
            min={0}
            autoFocus
            value={tenderedInput}
            onChange={(e) => setTenderedInput(e.target.value)}
            placeholder="0"
          />
          <div className="pay__quick">
            <button type="button" onClick={() => setTenderedInput(String(cashDue))}>
              {t('pay.exact')}
            </button>
            {QUICK_CASH.map((n) => (
              <button key={n} type="button" onClick={() => setTenderedInput(String(tendered + n))}>
                +{n / 1000}k
              </button>
            ))}
            <button type="button" onClick={() => setTenderedInput('')}>
              ✕
            </button>
          </div>
        </section>

        <div className={'pay__change' + (tenderedOk ? ' ok' : tendered > 0 ? ' bad' : '')}>
          <span>🔄 {t('pay.change')}</span>
          <strong>{fmtMoney(Math.max(0, change))}</strong>
        </div>
        {tendered > 0 && !tenderedOk && <Notice tone="error">{t('pay.insufficient')}</Notice>}
        {tenderedOk && change > 0 && (
          <Notice tone="info">
            💰 {t('pay.returnChange')}: <strong>{fmtMoney(change)}</strong>
          </Notice>
        )}

        <div className="actions">
          <Button onClick={confirmCash} disabled={!tenderedOk || submitting}>
            {submitting ? t('checkout.submitting') : `✅ ${t('pay.confirm')}`}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="pay">
      <div className="pay__head">
        <Button variant="ghost" onClick={onBack} disabled={submitting}>
          ‹ {t('pay.back')}
        </Button>
        <h3>{t('pay.title')}</h3>
      </div>

      <ul className="pay__items">
        {items.map((i) => (
          <li key={i.key}>
            <span className="name">{i.name}</span>
            <span className="muted">{i.qty}×</span>
            <span>{fmtMoney(i.price * i.qty)}</span>
          </li>
        ))}
      </ul>

      <div className="pay__modes">
        <button
          type="button"
          className={'pay__mode' + (mode === 'single' ? ' pay__mode--active' : '')}
          onClick={() => setMode('single')}
        >
          {t('pay.single')}
        </button>
        <button
          type="button"
          className={'pay__mode' + (mode === 'split' ? ' pay__mode--active' : '')}
          onClick={() => setMode('split')}
          disabled={hasDiscount}
          title={hasDiscount ? t('pay.splitNoDiscount') : undefined}
        >
          {t('pay.split')}
        </button>
      </div>

      {mode === 'single' && (
        <>
          <section className="pay__section">
            <h4>
              💸 {t('pay.discount')} <span className="muted">({t('pay.optional')})</span>
            </h4>
            <div className="pay__discount">
              <div className="pay__seg">
                <button
                  type="button"
                  className={discountMode === 'amount' ? 'active' : ''}
                  onClick={() => setDiscountMode('amount')}
                >
                  Rp
                </button>
                <button
                  type="button"
                  className={discountMode === 'percent' ? 'active' : ''}
                  onClick={() => setDiscountMode('percent')}
                >
                  %
                </button>
              </div>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={discountMode === 'percent' ? 100 : subtotal}
                value={isFree ? '' : discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder={isFree ? t('pay.freeNote') : '0'}
                disabled={isFree}
              />
            </div>
          </section>

          <section className="pay__section">
            <h4>💳 {t('pay.method')}</h4>
            {methodsError && <Notice tone="warn">{methodsError}</Notice>}
            {loadingMethods ? (
              <p className="muted">{t('common.loading')}</p>
            ) : available.length === 0 ? (
              <Notice tone="warn">{t('pay.noMethods')}</Notice>
            ) : (
              <div className="pay__methods">
                {available.map((m) => (
                  <button
                    key={m.pn || m.name}
                    type="button"
                    className={'pay__method' + (selected === m.name ? ' pay__method--active' : '')}
                    onClick={() => setSelected(m.name)}
                  >
                    <span className="pay__method-icon">{paymentIcon(m.name)}</span>
                    <span>{m.name}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {mode === 'split' && (
        <section className="pay__section">
          <h4>🔀 {t('pay.split')}</h4>
          <p className="muted">{t('pay.splitHint')}</p>
          <div className="pay__splits">
            {available.map((m) => (
              <div key={m.pn || m.name} className="pay__split-row">
                <span className="name">
                  {paymentIcon(m.name)} {m.name}
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={splits[m.name] ?? ''}
                  onChange={(e) => setSplits((prev) => ({ ...prev, [m.name]: e.target.value }))}
                  placeholder="0"
                />
                <button type="button" className="pay__fill" onClick={() => fillRemaining(m.name)}>
                  {t('pay.fill')}
                </button>
              </div>
            ))}
          </div>
          <div className={'pay__split-status' + (splitRemaining === 0 ? ' ok' : '')}>
            {splitRemaining === 0
              ? `✓ ${t('pay.splitBalanced')}`
              : splitRemaining > 0
                ? `${t('pay.remaining')}: ${fmtMoney(splitRemaining)}`
                : `${t('pay.over')}: ${fmtMoney(-splitRemaining)}`}
          </div>
        </section>
      )}

      <div className="pay__summary">
        <div>
          <span>{t('pay.subtotal')}</span>
          <span>{fmtMoney(subtotal)}</span>
        </div>
        {hasDiscount && mode === 'single' && (
          <div className="pay__line-discount">
            <span>
              {isFree ? t('pay.freeLabel') : `${t('pay.discount')} ${discountMode === 'percent' ? `(${discountValue}%)` : ''}`}
            </span>
            <span>− {fmtMoney(discount)}</span>
          </div>
        )}
        <div className="pay__total">
          <span>{t('checkout.total')}</span>
          <span>{fmtMoney(mode === 'split' ? subtotal : total)}</span>
        </div>
      </div>

      {mode === 'split' && hasDiscount && <Notice tone="warn">{t('pay.splitNoDiscount')}</Notice>}

      <div className="actions">
        <Button onClick={confirm} disabled={!canConfirm || submitting}>
          {submitting
            ? t('checkout.submitting')
            : (mode === 'split' ? splitCashPortion > 0 : selectedMethod && isCashLike(selectedMethod.name) && total > 0)
              ? `💵 ${t('pay.enterCash')} · ${fmtMoney(mode === 'split' ? subtotal : total)}`
              : `✅ ${t('pay.confirm')} · ${fmtMoney(mode === 'split' ? subtotal : total)}`}
        </Button>
      </div>
    </div>
  )
}
