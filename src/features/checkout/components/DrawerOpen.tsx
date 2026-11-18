import { useCallback, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Button, Notice } from '@/components/ui'
import { useI18n } from '@/i18n'
import type { AuthContext } from '@/services/api'
import { authorizeDrawerOpen, getDrawerStatus, logDrawerOpen, validateDrawerPin } from '../api'
import { DRAWER_KICK, isAndroid, sendToRawBT } from '../escpos'
import './drawer.css'

type Phase = 'idle' | 'checking' | 'pin' | 'opening' | 'done'

/**
 * Manual cash-drawer open — mirrors promptCashDrawerOpen()/executeCashDrawerOpen_():
 * status check → PIN entry → validate → authorize (single-use) → kick → audit log.
 * The kick itself is an ESC/POS pulse printed through the browser (RawBT / raw
 * ESC-POS printers honour it); the server authorisation + audit are identical.
 */
export function useDrawerOpen(auth: AuthContext) {
  const { t } = useI18n()
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)

  const kick = useCallback(() => {
    if (isAndroid()) {
      sendToRawBT([0x1b, 0x40, ...DRAWER_KICK])
      return
    }
    const host = document.getElementById('root') ?? document.body
    const el = document.createElement('div')
    el.className = 'drawer-kick-print'
    el.textContent = '\x1b@' + '\x1bp\x00\x32\xFF' + '\x1bp\x01\x32\xFF'
    host.appendChild(el)
    try {
      window.print()
    } finally {
      setTimeout(() => el.remove(), 500)
    }
  }, [])

  const execute = useCallback(async () => {
    setPhase('opening')
    const authRes = await authorizeDrawerOpen(auth)
    if (!authRes.success) {
      setError(authRes.error ?? t('drawer.unauthorized'))
      setPhase('idle')
      return
    }
    let result = 'ok'
    try {
      kick()
    } catch (e) {
      result = 'error:' + String(e)
    }
    logDrawerOpen(result, auth).catch(() => undefined)
    setPhase('done')
    setTimeout(() => setPhase('idle'), 1500)
  }, [auth, kick, t])

  const start = useCallback(async () => {
    setError(null)
    setPhase('checking')
    const status = await getDrawerStatus(auth)
    if (!status) {
      setError(t('drawer.statusFailed'))
      setPhase('idle')
      return
    }
    if (!status.pinConfigured) {
      setError(t('drawer.notConfigured'))
      setPhase('idle')
      return
    }
    if (status.pendingOpen && !status.pendingForYou) {
      setError(t('drawer.pendingOther'))
      setPhase('idle')
      return
    }
    if (status.pendingForYou) {
      await execute()
      return
    }
    if (!status.pinWindowActive) {
      setError(t('drawer.notActive'))
      setPhase('idle')
      return
    }
    setPhase('pin')
  }, [auth, execute, t])

  const submitPin = useCallback(
    async (pin: string) => {
      if (!/^\d{4,8}$/.test(pin)) {
        setError(t('drawer.invalidPin'))
        return
      }
      setError(null)
      setPhase('checking')
      const res = await validateDrawerPin(pin, auth)
      if (!res.success) {
        setError(res.error ?? t('drawer.wrongPin'))
        setPhase('pin')
        return
      }
      await execute()
    },
    [auth, execute, t],
  )

  const cancel = useCallback(() => {
    setPhase('idle')
    setError(null)
  }, [])

  return { phase, error, start, submitPin, cancel }
}

export function DrawerPinModal({
  onSubmit,
  onCancel,
  busy,
  error,
}: {
  onSubmit: (pin: string) => void
  onCancel: () => void
  busy: boolean
  error: string | null
}) {
  const { t } = useI18n()
  const [pin, setPin] = useState('')
  const host = document.getElementById('root') ?? document.body

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(pin)
  }

  return createPortal(
    <div className="drawer-modal__backdrop" role="dialog" aria-modal="true">
      <form className="drawer-modal" onSubmit={submit}>
        <h3>🔐 {t('drawer.title')}</h3>
        <p className="muted">{t('drawer.enterPin')}</p>
        <input
          className="drawer-modal__pin"
          type="password"
          inputMode="numeric"
          pattern="\d*"
          maxLength={8}
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder="••••"
        />
        {error && <Notice tone="error">{error}</Notice>}
        <div className="actions">
          <Button type="submit" disabled={busy || pin.length < 4}>
            {busy ? t('common.loading') : t('drawer.open')}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            {t('receipt.close')}
          </Button>
        </div>
      </form>
    </div>,
    host,
  )
}
