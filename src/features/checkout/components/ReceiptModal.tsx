import { createPortal } from 'react-dom'
import { useI18n } from '@/i18n'
import { Button } from '@/components/ui'
import type { Receipt } from '../hooks/useLastReceipt'
import { buildReceiptBytes, isAndroid, sendToRawBT } from '../escpos'
import './receipt.css'

/**
 * Receipt preview + print. Mirrors the original printReceiptInline(): a
 * full-screen overlay where only the 80mm receipt is printed. Rendered via a
 * portal directly under #root so the print stylesheet can isolate it.
 */
export function ReceiptModal({ receipt, onClose }: { receipt: Receipt; onClose: () => void }) {
  const { t, lang, fmtNum } = useI18n()
  const locale = lang === 'id' ? 'id-ID' : 'en-US'
  const when = new Date(receipt.at)
  const host = document.getElementById('root') ?? document.body

  const printRaw = () =>
    sendToRawBT(
      buildReceiptBytes(receipt, {
        title: t('receipt.title'),
        order: t('receipt.order'),
        subtotal: t('receipt.subtotal'),
        discount: t('receipt.discount'),
        total: t('checkout.total'),
        payment: t('checkout.payment'),
        paid: t('receipt.paid'),
        change: t('receipt.change'),
        operator: t('checkout.operator'),
        thanks: t('receipt.thanks'),
      }),
    )

  return createPortal(
    <div className="receipt-overlay" role="dialog" aria-modal="true">
      <div className="receipt-toolbar no-print">
        {isAndroid() && (
          <Button onClick={printRaw}>🖨️ {t('receipt.print')} (RawBT)</Button>
        )}
        <Button variant={isAndroid() ? 'ghost' : undefined} onClick={() => window.print()}>
          🖨️ {t('receipt.print')}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          ✕ {t('receipt.close')}
        </Button>
      </div>

      <div className="receipt">
        <div className="receipt__center receipt__bold">{t('receipt.title')}</div>
        {receipt.outlet && <div className="receipt__center">{receipt.outlet}</div>}
        <div className="receipt__center">
          {t('receipt.order')}: {receipt.orderNumber}
        </div>
        <div className="receipt__center">
          {when.toLocaleDateString(locale)} {when.toLocaleTimeString(locale)}
        </div>
        <div className="receipt__rule" />
        {receipt.items.map((i) => (
          <div key={i.key} className="receipt__row">
            <div className="receipt__name">{i.name}</div>
            <div className="receipt__qty">{i.qty}x</div>
            <div className="receipt__amt">{fmtNum(i.price * i.qty)}</div>
          </div>
        ))}
        <div className="receipt__rule" />
        {(receipt.discount ?? 0) > 0 && (
          <>
            <div className="receipt__row">
              <div className="receipt__name">{t('receipt.subtotal')}</div>
              <div className="receipt__amt">{fmtNum(receipt.subtotal ?? receipt.total + (receipt.discount ?? 0))}</div>
            </div>
            <div className="receipt__row">
              <div className="receipt__name">{t('receipt.discount')}</div>
              <div className="receipt__amt">-{fmtNum(receipt.discount ?? 0)}</div>
            </div>
          </>
        )}
        <div className="receipt__row receipt__bold receipt__total">
          <div className="receipt__name">{t('checkout.total')}</div>
          <div className="receipt__amt">{fmtNum(receipt.total)}</div>
        </div>
        {receipt.paymentSplits?.length ? (
          receipt.paymentSplits.map((s) => (
            <div key={s.method} className="receipt__row">
              <div className="receipt__name">{s.method}</div>
              <div className="receipt__amt">{fmtNum(s.amount)}</div>
            </div>
          ))
        ) : (
          <div className="receipt__row">
            <div className="receipt__name">{t('checkout.payment')}</div>
            <div className="receipt__amt">{receipt.payment}</div>
          </div>
        )}
        {receipt.cashTendered !== undefined && (
          <>
            <div className="receipt__row">
              <div className="receipt__name">{t('receipt.paid')}</div>
              <div className="receipt__amt">{fmtNum(receipt.cashTendered)}</div>
            </div>
            <div className="receipt__row receipt__bold">
              <div className="receipt__name">{t('receipt.change')}</div>
              <div className="receipt__amt">{fmtNum(receipt.changeAmount ?? 0)}</div>
            </div>
          </>
        )}
        {receipt.openCashDrawer && (
          // ESC p pulse (pins 2 & 5) so RawBT / ESC-POS raw printers kick the drawer
          // when the receipt is printed. Invisible in the preview and in PDF output.
          <span className="receipt__drawer" aria-hidden="true">
            {'\x1b' + 'p' + '\x00' + '\x32' + '\xFF' + '\x1b' + 'p' + '\x01' + '\x32' + '\xFF'}
          </span>
        )}
        <div className="receipt__rule" />
        <div className="receipt__center receipt__small">
          {t('checkout.operator')}: {receipt.operator}
        </div>
        <div className="receipt__center receipt__small">{t('receipt.thanks')}</div>
      </div>
    </div>,
    host,
  )
}
