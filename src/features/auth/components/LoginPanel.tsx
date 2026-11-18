import { useState, type FormEvent } from 'react'
import { apiConfig } from '@/services/api'
import { Button, Notice, Panel } from '@/components/ui'
import { useI18n } from '@/i18n'

/** Operator sign-in form. Submits credentials via the auth hook's `onLogin`. */
export function LoginPanel({
  onLogin,
  loading,
  error,
}: {
  onLogin: (username: string, password: string) => void
  loading: boolean
  error: string | null
}) {
  const { t } = useI18n()
  const configured = Boolean(apiConfig.appsScriptUrl)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onLogin(username, password)
  }

  return (
    <Panel title={t('login.title')}>
      {!configured && <Notice tone="warn">{t('login.setup')}</Notice>}
      <form onSubmit={submit}>
        <label className="ui-field">
          {t('login.username')}
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </label>
        <label className="ui-field">
          {t('login.password')}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        <div className="actions">
          <Button type="submit" disabled={!configured || loading || !username || !password}>
            {loading ? t('login.signingIn') : t('login.signIn')}
          </Button>
        </div>
      </form>
      {error && <Notice tone="error">{error}</Notice>}
    </Panel>
  )
}
