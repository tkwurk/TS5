import { useCallback, useEffect, useState } from 'react'
import type { AuthContext } from '@/services/api'
import { Badge, Button, DataTable, Field, FormRow, Notice, Panel, Select, TextArea, TextInput } from '@/components/ui'
import { useI18n } from '@/i18n'
import {
  fetchAllDefs,
  fetchAllQuestions,
  fetchRoleOptions,
  saveDef,
  saveQuestion,
  yn,
  type ChecklistDefAdmin,
  type ChecklistQuestionAdmin,
} from '../api'

type Msg = { tone: 'info' | 'error'; text: string }
const splitCsv = (v?: string) =>
  (v ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

/** Mirrors ui_checklist.html admin "definitions" pane. */
export function ChecklistDefsAdmin({ auth, onManageQuestions }: { auth: AuthContext; onManageQuestions: (id: string) => void }) {
  const { t } = useI18n()
  const [defs, setDefs] = useState<ChecklistDefAdmin[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [editing, setEditing] = useState<Partial<ChecklistDefAdmin> | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<Msg | null>(null)

  const load = useCallback(async () => {
    const [d, r] = await Promise.all([fetchAllDefs(auth), fetchRoleOptions(auth)])
    setDefs(d)
    setRoles(r)
  }, [auth])
  useEffect(() => {
    load()
  }, [load])

  const toggleRole = (field: 'assignedRoles' | 'reviewerRoles', role: string) =>
    setEditing((e) => {
      const cur = splitCsv(e?.[field])
      const next = cur.includes(role) ? cur.filter((x) => x !== role) : [...cur, role]
      return { ...e, [field]: next.join(',') }
    })

  const save = async () => {
    if (!editing?.name?.trim()) return setMsg({ tone: 'error', text: t('adm.needName') })
    setSaving(true)
    const r = await saveDef(editing, auth)
    setSaving(false)
    if (r.ok) {
      setMsg({ tone: 'info', text: `${t('common.saved')} — ${r.data?.id ?? editing.name}` })
      setEditing(null)
      load()
    } else setMsg({ tone: 'error', text: r.error ?? '' })
  }

  return (
    <Panel title={`📁 ${t('adm.checklists')}`}>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <div className="actions">
        <Button onClick={() => setEditing({ status: 'Active', assignedRoles: '', reviewerRoles: '', outlets: '' })}>➕ {t('adm.newChecklist')}</Button>
        <Button variant="ghost" onClick={load}>
          ↻
        </Button>
      </div>
      {editing && (
        <div className="ui-form">
          <FormRow>
            <Field label={t('adm.name')}>
              <TextInput value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label={t('kitchen.status')}>
              <Select value={editing.status ?? 'Active'} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Select>
            </Field>
            <Field label={t('adm.outletsCsv')}>
              <TextInput value={editing.outlets ?? ''} onChange={(e) => setEditing({ ...editing, outlets: e.target.value })} placeholder="TS4, TS5" />
            </Field>
          </FormRow>
          <Field label={t('adm.description')}>
            <TextArea rows={2} value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </Field>
          <FormRow>
            {(['assignedRoles', 'reviewerRoles'] as const).map((field) => (
              <Field key={field} label={t(field === 'assignedRoles' ? 'adm.assignedRoles' : 'adm.reviewerRoles')}>
                <div className="actions" style={{ flexWrap: 'wrap' }}>
                  {roles.map((r) => (
                    <label key={r} style={{ display: 'inline-flex', gap: '0.3rem', alignItems: 'center' }}>
                      <input type="checkbox" checked={splitCsv(editing[field]).includes(r)} onChange={() => toggleRole(field, r)} /> {r}
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
        rows={defs as unknown as Record<string, unknown>[]}
        rowKey={(r) => String(r.id)}
        empty={t('adm.noChecklists')}
        columns={[
          { key: 'id', label: 'ID', render: (r) => <code>{String(r.id)}</code> },
          { key: 'name', label: t('adm.name') },
          { key: 'assignedRoles', label: t('adm.assignedRoles') },
          { key: 'reviewerRoles', label: t('adm.reviewerRoles') },
          { key: 'outlets', label: t('checkout.outlet') },
          { key: 'status', label: t('kitchen.status'), render: (r) => <Badge tone={String(r.status).toLowerCase() === 'active' ? 'ok' : 'neutral'}>{String(r.status ?? '')}</Badge> },
          {
            key: 'act',
            label: '',
            render: (r) => (
              <div className="actions">
                <Button variant="ghost" onClick={() => setEditing(r as unknown as ChecklistDefAdmin)}>
                  ✏️
                </Button>
                <Button variant="ghost" onClick={() => onManageQuestions(String(r.id))}>
                  ❓ {t('adm.questions')}
                </Button>
              </div>
            ),
          },
        ]}
      />
    </Panel>
  )
}

/** Mirrors ui_checklist.html admin "questions" pane. */
export function ChecklistQuestionsAdmin({ auth, checklistId, onChecklistChange }: { auth: AuthContext; checklistId: string; onChecklistChange: (id: string) => void }) {
  const { t } = useI18n()
  const [defs, setDefs] = useState<ChecklistDefAdmin[]>([])
  const [qs, setQs] = useState<ChecklistQuestionAdmin[]>([])
  const [editing, setEditing] = useState<Partial<ChecklistQuestionAdmin> | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<Msg | null>(null)

  useEffect(() => {
    fetchAllDefs(auth).then((d) => {
      setDefs(d)
      if (!checklistId && d.length) onChecklistChange(d[0].id)
    })
  }, [auth, checklistId, onChecklistChange])

  const load = useCallback(async () => {
    if (!checklistId) return
    setQs(await fetchAllQuestions(auth, checklistId))
  }, [auth, checklistId])
  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    if (!editing?.question?.trim()) return setMsg({ tone: 'error', text: t('adm.needQuestion') })
    setSaving(true)
    const r = await saveQuestion(
      { ...editing, checklistId, mandatory: yn(editing.mandatory), order: Number(editing.order) || qs.length + 1 },
      auth,
    )
    setSaving(false)
    if (r.ok) {
      setMsg({ tone: 'info', text: t('common.saved') })
      setEditing(null)
      load()
    } else setMsg({ tone: 'error', text: r.error ?? '' })
  }

  return (
    <Panel title={`❓ ${t('adm.checklistQuestions')}`}>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <FormRow>
        <Field label={t('chk.checklist')}>
          <Select value={checklistId} onChange={(e) => onChecklistChange(e.target.value)}>
            {defs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.id})
              </option>
            ))}
          </Select>
        </Field>
        <div className="actions" style={{ alignSelf: 'end' }}>
          <Button onClick={() => setEditing({ questionType: 'yesno', status: 'Active', mandatory: true, order: qs.length + 1 })}>➕ {t('adm.newQuestion')}</Button>
          <Button variant="ghost" onClick={load}>
            ↻
          </Button>
        </div>
      </FormRow>
      {editing && (
        <div className="ui-form">
          <Field label={t('adm.question')}>
            <TextArea rows={2} value={editing.question ?? ''} onChange={(e) => setEditing({ ...editing, question: e.target.value })} />
          </Field>
          <FormRow>
            <Field label={t('adm.type')}>
              <Select value={editing.questionType ?? 'yesno'} onChange={(e) => setEditing({ ...editing, questionType: e.target.value })}>
                <option value="yesno">yes/no</option>
                <option value="text">text</option>
                <option value="dropdown">dropdown</option>
                <option value="rating">rating</option>
              </Select>
            </Field>
            {editing.questionType === 'dropdown' && (
              <Field label={t('adm.dropdownValues')}>
                <TextInput value={editing.dropdownValues ?? ''} onChange={(e) => setEditing({ ...editing, dropdownValues: e.target.value })} placeholder="A, B, C" />
              </Field>
            )}
            <Field label={t('inv.category')}>
              <TextInput value={editing.category ?? ''} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
            </Field>
            <Field label={t('adm.order')}>
              <TextInput type="number" value={String(editing.order ?? '')} onChange={(e) => setEditing({ ...editing, order: e.target.value })} />
            </Field>
          </FormRow>
          <FormRow>
            <Field label={t('checkout.outlet')}>
              <TextInput value={editing.outlet ?? ''} onChange={(e) => setEditing({ ...editing, outlet: e.target.value })} placeholder={t('common.all')} />
            </Field>
            <Field label={t('kitchen.status')}>
              <Select value={editing.status ?? 'Active'} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Select>
            </Field>
            <label className="ui-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', alignSelf: 'end' }}>
              <input type="checkbox" checked={yn(editing.mandatory)} onChange={(e) => setEditing({ ...editing, mandatory: e.target.checked })} /> {t('adm.mandatory')}
            </label>
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
        rows={qs as unknown as Record<string, unknown>[]}
        rowKey={(r) => String(r.sn)}
        empty={t('chk.noQuestions')}
        columns={[
          { key: 'order', label: '#', align: 'right' },
          { key: 'question', label: t('adm.question') },
          { key: 'questionType', label: t('adm.type') },
          { key: 'category', label: t('inv.category') },
          { key: 'outlet', label: t('checkout.outlet') },
          { key: 'mandatory', label: t('adm.mandatory'), render: (r) => (yn(r.mandatory) ? '✔' : '') },
          { key: 'status', label: t('kitchen.status'), render: (r) => <Badge tone={String(r.status).toLowerCase() === 'active' ? 'ok' : 'neutral'}>{String(r.status ?? '')}</Badge> },
          { key: 'act', label: '', render: (r) => <Button variant="ghost" onClick={() => setEditing(r as unknown as ChecklistQuestionAdmin)}>✏️</Button> },
        ]}
      />
    </Panel>
  )
}
