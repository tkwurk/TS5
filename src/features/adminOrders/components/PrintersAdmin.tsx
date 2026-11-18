import { useCallback, useEffect, useState } from 'react'
import { fmtDateTime, fmtTimeOnly } from '@/lib/dates'
import type { AuthContext } from '@/services/api'
import { Badge, Button, DataTable, Field, FormRow, Notice, Panel, Select, TextInput } from '@/components/ui'
import { useI18n } from '@/i18n'
import {
  activateUnlockPin,
  deletePrinter,
  fetchAllPrinters,
  fetchOutletPrinter,
  fetchOutlets,
  fetchUnlockStatus,
  saveAutoPrint,
  saveDrawerPinMode,
  savePrinter,
  saveUnlockPin,
  type PrinterCfg,
} from '../api'

type Msg = { tone: 'info' | 'error'; text: string }
type Unlock = { pinConfigured?: boolean; pinWindowActive?: boolean; activeUntil?: string | null }

/** Mirrors ui_adminOrders.html "Printer" pane: per-outlet printer, auto-print, drawer-PIN mode and manual unlock PIN. */
export function PrintersAdmin({ auth }: { auth: AuthContext }) {
  const { t } = useI18n()
  const [outlets, setOutlets] = useState<string[]>([])
  const [outlet, setOutlet] = useState(auth.outlet ?? '')
  const [all, setAll] = useState<PrinterCfg[]>([])
  const [name, setName] = useState('')
  const [type, setType] = useState('bluetooth')
  const [autoPrint, setAutoPrint] = useState(false)
  const [drawerPin, setDrawerPin] = useState('0')
  const [pin, setPin] = useState('')
  const [unlock, setUnlock] = useState<Unlock | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Msg | null>(null)

  const loadAll = useCallback(async () => {
    const [o, p] = await Promise.all([fetchOutlets(auth), fetchAllPrinters(auth)])
    setOutlets(o.length ? o : [auth.outlet ?? ''].filter(Boolean))
    setAll(p)
  }, [auth])
  const loadOutlet = useCallback(async () => {
    if (!outlet) return
    const [p, u] = await Promise.all([fetchOutletPrinter(outlet, auth), fetchUnlockStatus(outlet, auth)])
    setName(p?.printerName ?? '')
    setType(p?.printerType || 'bluetooth')
    setAutoPrint(Boolean(p?.autoPrint))
    setDrawerPin(String(p?.drawerPin ?? '0'))
    setUnlock(u.ok ? u.data : null)
  }, [auth, outlet])
  useEffect(() => {
    loadAll()
  }, [loadAll])
  useEffect(() => {
    loadOutlet()
  }, [loadOutlet])

  const act = async (fn: () => Promise<{ ok: boolean; error: string | null }>, okText: string) => {
    setBusy(true)
    const r = await fn()
    setBusy(false)
    if (r.ok) {
      setMsg({ tone: 'info', text: okText })
      loadAll()
      loadOutlet()
    } else setMsg({ tone: 'error', text: r.error ?? '' })
  }

  return (
    <Panel title={`🖨️ ${t('adm.printers')}`}>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <FormRow>
        <Field label={t('checkout.outlet')}>
          <Select value={outlet} onChange={(e) => setOutlet(e.target.value)}>
            {outlets.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('adm.printerName')}>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. RPP02N" />
        </Field>
        <Field label={t('adm.printerType')}>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="bluetooth">Bluetooth</option>
            <option value="usb">USB</option>
            <option value="network">Network</option>
          </Select>
        </Field>
        <div className="actions" style={{ alignSelf: 'end' }}>
          <Button disabled={busy || !name.trim()} onClick={() => act(() => savePrinter({ outlet, printerName: name.trim(), printerType: type }, auth), t('common.saved'))}>
            💾 {t('adm.savePrinter')}
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => window.confirm(`${t('adm.confirmDeletePrinter')} ${outlet}?`) && act(() => deletePrinter(outlet, auth), t('adm.deleted'))}
          >
            🗑️
          </Button>
        </div>
      </FormRow>

      <FormRow>
        <label className="ui-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', alignSelf: 'end' }}>
          <input
            type="checkbox"
            checked={autoPrint}
            disabled={busy}
            onChange={(e) => {
              setAutoPrint(e.target.checked)
              act(() => saveAutoPrint(outlet, e.target.checked, auth), t('common.saved'))
            }}
          />
          {t('adm.autoPrint')}
        </label>
        <Field label={t('adm.drawerPinMode')}>
          <Select
            value={drawerPin}
            disabled={busy}
            onChange={(e) => {
              setDrawerPin(e.target.value)
              act(() => saveDrawerPinMode(outlet, e.target.value, auth), t('common.saved'))
            }}
          >
            <option value="0">{t('adm.drawerPin0')}</option>
            <option value="1">{t('adm.drawerPin1')}</option>
            <option value="both">{t('adm.drawerPinBoth')}</option>
          </Select>
        </Field>
      </FormRow>

      <h4>🔐 {t('adm.unlockPin')}</h4>
      <p className="muted">{t('adm.unlockPinHelp')}</p>
      {unlock && (
        <div className="actions">
          <Badge tone={unlock.pinConfigured ? 'ok' : 'neutral'}>{unlock.pinConfigured ? t('adm.pinConfigured') : t('adm.pinNotConfigured')}</Badge>
          <Badge tone={unlock.pinWindowActive ? 'ok' : 'neutral'}>
            {unlock.pinWindowActive ? `${t('adm.windowActive')} ${fmtTimeOnly(unlock.activeUntil)}` : t('adm.windowInactive')}
          </Badge>
        </div>
      )}
      <FormRow>
        <Field label={t('adm.pin')}>
          <TextInput type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="4–8" />
        </Field>
        <div className="actions" style={{ alignSelf: 'end' }}>
          <Button
            disabled={busy || pin.length < 4}
            onClick={() =>
              act(() => saveUnlockPin(outlet, pin, auth), t('adm.pinSaved')).then(() => setPin(''))
            }
          >
            💾 {t('adm.savePin')}
          </Button>
          <Button variant="ghost" disabled={busy || !unlock?.pinConfigured} onClick={() => act(() => activateUnlockPin(outlet, auth), t('adm.pinActivated'))}>
            🔓 {t('adm.activatePin')}
          </Button>
        </div>
      </FormRow>

      <h4>{t('adm.allPrinters')}</h4>
      <DataTable
        rows={all as unknown as Record<string, unknown>[]}
        rowKey={(r) => String(r.outlet)}
        empty={t('adm.noPrinters')}
        columns={[
          { key: 'outlet', label: t('checkout.outlet') },
          { key: 'printerName', label: t('adm.printerName') },
          { key: 'printerType', label: t('adm.printerType') },
          { key: 'autoPrint', label: t('adm.autoPrint'), render: (r) => (r.autoPrint ? '✔' : '—') },
          { key: 'drawerPin', label: t('adm.drawerPinMode') },
          { key: 'updatedBy', label: t('kitchen.by'), render: (r) => <>{String(r.updatedBy ?? '')}<div className="muted">{fmtDateTime(r.updatedAt)}</div></> },
        ]}
      />
    </Panel>
  )
}
