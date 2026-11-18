import { Notice, Panel } from '@/components/ui'
import { useI18n } from '@/i18n'

/** Placeholder for screens not yet migrated from the Apps Script HTML UI. */
export function ComingSoon({ title }: { title: string }) {
  const { t } = useI18n()
  return (
    <Panel title={title}>
      <Notice tone="info">{t('nav.soon')}</Notice>
    </Panel>
  )
}
