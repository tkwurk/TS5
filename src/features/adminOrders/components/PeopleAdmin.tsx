import { useCallback, useEffect, useState } from 'react'
import type { AuthContext } from '@/services/api'
import { Badge, Button, DataTable, Field, FormRow, Notice, Panel, Select, TextInput } from '@/components/ui'
import { useI18n } from '@/i18n'
import { NAV_ITEMS } from '@/features/navigation'
import { clearUsersCache, fetchPeople, fetchRoleOptions, savePerson, yn, type Person } from '../api'

type Msg = { tone: 'info' | 'error'; text: string }
const ROLES_FALLBACK = ['admin', 'manager', 'supervisor', 'cashier', 'chef']
const ynStr = (v: unknown) => (yn(v) ? 'Y' : 'N')

/** Mirrors ui_adminOrders.html "People" pane: list + edit/create staff (role, outlet, PIN, login, tab overrides). */
export function PeopleAdmin({ auth }: { auth: AuthContext }) {
  const { t } = useI18n()
  const [people, setPeople] = useState<Person[]>([])
  const [roles, setRoles] = useState<string[]>(ROLES_FALLBACK)
  const [editing, setEditing] = useState<Partial<Person> | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [q, setQ] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<Msg | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [r, ro] = await Promise.all([fetchPeople(auth), fetchRoleOptions(auth)])
    setLoading(false)
    if (!r.ok) setMsg({ tone: 'error', text: r.error ?? '' })
    setPeople(r.people)
    if (ro.length) setRoles(Array.from(new Set(['admin', ...ro])))
  }, [auth])
  useEffect(() => {
    load()
  }, [load])

  const ql = q.trim().toLowerCase()
  const rows = people.filter((p) => !ql || p.person_id.toLowerCase().includes(ql) || (p.display_name || '').toLowerCase().includes(ql) || (p.role || '').toLowerCase().includes(ql))

  const save = async () => {
    if (!editing?.person_id?.trim()) return setMsg({ tone: 'error', text: t('adm.needPersonId') })
    if (isNew && people.some((p) => p.person_id.toLowerCase() === editing.person_id!.trim().toLowerCase()))
      return setMsg({ tone: 'error', text: t('adm.personExists') })
    setSaving(true)
    const payload: Partial<Person> = {
      person_id: editing.person_id.trim(),
      display_name: editing.display_name ?? '',
      role: editing.role ?? 'cashier',
      outlet: editing.outlet ?? '',
      email: editing.email ?? '',
      active: ynStr(editing.active ?? 'Y'),
      can_login: ynStr(editing.can_login ?? 'Y'),
      extra_tabs: editing.extra_tabs ?? '',
      denied_tabs: editing.denied_tabs ?? '',
    }
    if (editing.pin_code) payload.pin_code = editing.pin_code
    const r = await savePerson(payload, auth)
    setSaving(false)
    if (r.ok) {
      await clearUsersCache(auth)
      setMsg({ tone: 'info', text: `${t('common.saved')} — ${payload.person_id}` })
      setEditing(null)
      load()
    } else setMsg({ tone: 'error', text: r.error ?? '' })
  }

  const tabToggle = (field: 'extra_tabs' | 'denied_tabs', id: string) =>
    setEditing((e) => {
      const cur = (e?.[field] ?? '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
      return { ...e, [field]: next.join(',') }
    })

  return (
    <Panel title={`👥 ${t('adm.people')}`}>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <FormRow>
        <Field label={t('checkout.search')}>
          <TextInput type="search" value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
        <div className="actions" style={{ alignSelf: 'end' }}>
          <Button
            onClick={() => {
              setIsNew(true)
              setEditing({ role: 'cashier', outlet: auth.outlet ?? '', active: 'Y', can_login: 'Y' })
            }}
          >
            ➕ {t('adm.newPerson')}
          </Button>
          <Button variant="ghost" onClick={load} disabled={loading}>
            {loading ? t('common.loading') : '↻'}
          </Button>
        </div>
      </FormRow>
      {editing && (
        <div className="ui-form">
          <FormRow>
            <Field label={t('adm.personId')}>
              <TextInput value={editing.person_id ?? ''} disabled={!isNew} onChange={(e) => setEditing({ ...editing, person_id: e.target.value })} />
            </Field>
            <Field label={t('adm.displayName')}>
              <TextInput value={editing.display_name ?? ''} onChange={(e) => setEditing({ ...editing, display_name: e.target.value })} />
            </Field>
            <Field label={t('adm.role')}>
              <Select value={editing.role ?? 'cashier'} onChange={(e) => setEditing({ ...editing, role: e.target.value })}>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('checkout.outlet')}>
              <TextInput value={editing.outlet ?? ''} onChange={(e) => setEditing({ ...editing, outlet: e.target.value })} />
            </Field>
          </FormRow>
          <FormRow>
            <Field label="Email">
              <TextInput type="email" value={editing.email ?? ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            </Field>
            <Field label={t('adm.pin')}>
              <TextInput type="password" inputMode="numeric" value={editing.pin_code ?? ''} placeholder={isNew ? '' : '••••'} onChange={(e) => setEditing({ ...editing, pin_code: e.target.value })} />
            </Field>
            <label className="ui-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', alignSelf: 'end' }}>
              <input type="checkbox" checked={yn(editing.active ?? 'Y')} onChange={(e) => setEditing({ ...editing, active: e.target.checked ? 'Y' : 'N' })} /> {t('adm.active')}
            </label>
            <label className="ui-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', alignSelf: 'end' }}>
              <input type="checkbox" checked={yn(editing.can_login ?? 'Y')} onChange={(e) => setEditing({ ...editing, can_login: e.target.checked ? 'Y' : 'N' })} /> {t('adm.canLogin')}
            </label>
          </FormRow>
          <FormRow>
            {(['extra_tabs', 'denied_tabs'] as const).map((field) => (
              <Field key={field} label={t(field === 'extra_tabs' ? 'adm.extraTabs' : 'adm.deniedTabs')}>
                <div className="actions" style={{ flexWrap: 'wrap' }}>
                  {NAV_ITEMS.map((n) => (
                    <label key={n.id} style={{ display: 'inline-flex', gap: '0.3rem', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={(editing[field] ?? '')
                          .split(',')
                          .map((x) => x.trim())
                          .includes(n.id)}
                        onChange={() => tabToggle(field, n.id)}
                      />
                      {n.icon} {t(n.labelKey)}
                    </label>
                  ))}
                </div>
              </Field>
            ))}
          </FormRow>
          <div className="actions">
            <Button onClick={save} disabled={saving}>
              💾 {t('common.save')}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}
      <DataTable
        rows={rows as unknown as Record<string, unknown>[]}
        rowKey={(r) => String(r.person_id)}
        empty={loading ? t('common.loading') : t('att.noEmployees')}
        columns={[
          { key: 'person_id', label: t('adm.personId'), render: (r) => <code>{String(r.person_id)}</code> },
          { key: 'display_name', label: t('adm.displayName') },
          { key: 'role', label: t('adm.role') },
          { key: 'outlet', label: t('checkout.outlet') },
          { key: 'active', label: t('adm.active'), render: (r) => <Badge tone={yn(r.active) ? 'ok' : 'bad'}>{ynStr(r.active)}</Badge> },
          { key: 'can_login', label: t('adm.canLogin'), render: (r) => (yn(r.can_login) ? '✔' : '—') },
          {
            key: 'act',
            label: '',
            render: (r) => (
              <Button
                variant="ghost"
                onClick={() => {
                  setIsNew(false)
                  setEditing({ ...(r as unknown as Person), pin_code: '' })
                }}
              >
                ✏️
              </Button>
            ),
          },
        ]}
      />
    </Panel>
  )
}
