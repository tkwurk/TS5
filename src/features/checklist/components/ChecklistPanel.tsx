import { useCallback, useEffect, useState } from 'react'
import { fmtDateTime } from '@/lib/dates'
import type { AuthContext } from '@/services/api'
import { Badge, Button, DataTable, Field, Notice, Panel, Select, SubTabs, TextArea, TextInput } from '@/components/ui'
import { useI18n } from '@/i18n'
import {
  fetchDefinitions,
  fetchFillBundle,
  fetchReviewQueue,
  reviewShift,
  submitResponses,
  todayShiftId,
  type ChecklistDef,
  type ChecklistQuestion,
  type ReviewItem,
} from '../api'

type Tab = 'fill' | 'review'
type Msg = { tone: 'info' | 'error'; text: string }

/** Checklist — mirrors ui_checklist.html: fill today's checklist (per definition) and review submitted shifts. */
export function ChecklistPanel({ auth }: { auth: AuthContext }) {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('fill')
  const [msg, setMsg] = useState<Msg | null>(null)
  const [defs, setDefs] = useState<ChecklistDef[]>([])
  const [defId, setDefId] = useState('')
  const [questions, setQuestions] = useState<ChecklistQuestion[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [answers, setAnswers] = useState<Record<string, { response: string; comments: string }>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [queue, setQueue] = useState<ReviewItem[]>([])

  const loadDefs = useCallback(async () => {
    const d = await fetchDefinitions(auth)
    setDefs(d)
    if (!defId && d.length) setDefId((d.find((x) => x.canFill) ?? d[0]).id)
  }, [auth, defId])

  const loadBundle = useCallback(async () => {
    if (!defId) return
    setLoading(true)
    const b = await fetchFillBundle(auth, defId, todayShiftId(auth.outlet ?? '', defId))
    setLoading(false)
    const qs = (b?.questions ?? []).filter((q) => (q.status ?? 'Active').toUpperCase() === 'ACTIVE')
    setQuestions(qs)
    setSubmitted(Boolean(b?.status?.submitted))
    const a: Record<string, { response: string; comments: string }> = {}
    for (const r of b?.status?.responses ?? []) a[r.questionSn] = { response: r.response, comments: r.comments }
    setAnswers(a)
  }, [auth, defId])

  const loadQueue = useCallback(async () => {
    setQueue(await fetchReviewQueue(auth))
  }, [auth])

  useEffect(() => {
    loadDefs()
    loadQueue()
  }, [loadDefs, loadQueue])
  useEffect(() => {
    loadBundle()
  }, [loadBundle])

  const submit = async () => {
    const missing = questions.filter((q) => q.mandatory && !(answers[q.sn]?.response ?? '').trim())
    if (missing.length) return setMsg({ tone: 'error', text: `${t('chk.missing')}: ${missing.map((q) => q.sn).join(', ')}` })
    setSaving(true)
    const r = await submitResponses(auth, {
      checklistId: defId,
      shiftId: todayShiftId(auth.outlet ?? '', defId),
      responses: questions.map((q) => ({ questionSn: q.sn, response: answers[q.sn]?.response ?? '', comments: answers[q.sn]?.comments ?? '' })),
    })
    setSaving(false)
    if (r.ok) {
      setMsg({ tone: 'info', text: `${t('chk.submitted')} (${r.data?.count ?? questions.length})` })
      loadBundle()
      loadQueue()
    } else setMsg({ tone: 'error', text: r.error ?? '' })
  }

  const review = async (item: ReviewItem) => {
    const r = await reviewShift(auth, { shiftId: item.shiftId, checklistId: item.checklistId, outlet: item.outlet })
    if (r.ok) {
      setMsg({ tone: 'info', text: `${t('chk.reviewed')} — ${item.checklistName}` })
      loadQueue()
    } else setMsg({ tone: 'error', text: r.error ?? '' })
  }

  const setAns = (sn: string, patch: Partial<{ response: string; comments: string }>) =>
    setAnswers((a) => ({ ...a, [sn]: { ...(a[sn] ?? { response: '', comments: '' }), ...patch } }))

  const input = (q: ChecklistQuestion) => {
    const v = answers[q.sn]?.response ?? ''
    const type = q.questionType.toLowerCase()
    if (type === 'yesno' || type === 'yes/no' || type === 'boolean') {
      return (
        <div className="actions" style={{ margin: 0 }}>
          {['Yes', 'No'].map((o) => (
            <Button key={o} variant={v === o ? 'primary' : 'ghost'} disabled={submitted} onClick={() => setAns(q.sn, { response: o })}>
              {o}
            </Button>
          ))}
        </div>
      )
    }
    if (type === 'dropdown' || type === 'select') {
      const opts = (q.dropdownValues ?? '').split(/[,|;]/).map((s) => s.trim()).filter(Boolean)
      return (
        <Select value={v} disabled={submitted} onChange={(e) => setAns(q.sn, { response: e.target.value })}>
          <option value="">—</option>
          {opts.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </Select>
      )
    }
    if (type === 'number') return <TextInput type="number" value={v} disabled={submitted} onChange={(e) => setAns(q.sn, { response: e.target.value })} />
    return <TextInput value={v} disabled={submitted} onChange={(e) => setAns(q.sn, { response: e.target.value })} />
  }

  return (
    <Panel title={`✅ ${t('nav.checklist')}`}>
      <SubTabs
        tabs={[
          { id: 'fill', label: `📝 ${t('chk.fill')}` },
          { id: 'review', label: `🔍 ${t('chk.review')} (${queue.length})` },
        ]}
        active={tab}
        onChange={setTab}
      />
      {msg && <Notice tone={msg.tone === 'error' ? 'error' : 'info'}>{msg.text}</Notice>}

      {tab === 'fill' && (
        <>
          <Field label={t('chk.checklist')}>
            <Select value={defId} onChange={(e) => setDefId(e.target.value)}>
              {defs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.canFill ? '' : ` (${t('chk.readOnly')})`}
                </option>
              ))}
            </Select>
          </Field>
          {submitted && <Notice tone="info">🔒 {t('chk.locked')}</Notice>}
          {loading ? (
            <p className="muted">{t('common.loading')}</p>
          ) : (
            <div className="chk-questions">
              {questions.map((q) => (
                <div key={q.sn} className="ui-panel" style={{ marginTop: '0.6rem', padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <strong>
                      {q.sn}. {q.question} {q.mandatory && <Badge tone="bad">*</Badge>}
                    </strong>
                    {q.category && <span className="muted">{q.category}</span>}
                  </div>
                  <div style={{ marginTop: '0.4rem' }}>{input(q)}</div>
                  <TextArea
                    rows={1}
                    placeholder={t('chk.comments')}
                    disabled={submitted}
                    value={answers[q.sn]?.comments ?? ''}
                    onChange={(e) => setAns(q.sn, { comments: e.target.value })}
                    style={{ width: '100%', marginTop: '0.4rem', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              {!questions.length && <p className="muted">{t('chk.noQuestions')}</p>}
            </div>
          )}
          {!submitted && questions.length > 0 && (
            <div className="actions">
              <Button onClick={submit} disabled={saving}>
                {saving ? t('checkout.submitting') : `✅ ${t('chk.submit')}`}
              </Button>
            </div>
          )}
        </>
      )}

      {tab === 'review' && (
        <>
          <div className="actions">
            <Button variant="ghost" onClick={loadQueue}>
              ↻
            </Button>
          </div>
          <DataTable
            rows={queue as unknown as Record<string, unknown>[]}
            rowKey={(r) => `${r.shiftId}|${r.checklistId}`}
            empty={t('chk.noPending')}
            columns={[
              { key: 'submittedAt', label: t('kitchen.when'), render: (r) => fmtDateTime(r.submittedAt) },
              { key: 'checklistName', label: t('chk.checklist') },
              { key: 'outlet', label: t('checkout.outlet') },
              { key: 'filledBy', label: t('kitchen.by') },
              { key: 'responseCount', label: t('chk.answers'), align: 'right' },
              { key: 'act', label: '', render: (r) => <Button onClick={() => review(r as unknown as ReviewItem)}>✔ {t('chk.markReviewed')}</Button> },
            ]}
          />
        </>
      )}
    </Panel>
  )
}
