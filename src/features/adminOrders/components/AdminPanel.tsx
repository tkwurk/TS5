import { useState } from 'react'
import type { AuthContext } from '@/services/api'
import { SubTabs } from '@/components/ui'
import { useI18n } from '@/i18n'
import { AdminOrdersPanel } from './AdminOrdersPanel'
import { ProductsAdmin } from './ProductsAdmin'
import { ChecklistDefsAdmin, ChecklistQuestionsAdmin } from './ChecklistAdmin'
import { BomAdmin, AutomationAdmin } from './SmartPicksBomAdmin'
import { PeopleAdmin } from './PeopleAdmin'
import { PrintersAdmin } from './PrintersAdmin'

type Tab = 'orders' | 'products' | 'checklistdefs' | 'checklistquestions' | 'smartpicks' | 'bom' | 'people' | 'printer'

/** Admin panel — mirrors ui_adminOrders.html's 8 sub-tabs. */
export function AdminPanel({ auth }: { auth: AuthContext }) {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('orders')
  const [checklistId, setChecklistId] = useState('')

  return (
    <div className="admin-shell">
      <SubTabs<Tab>
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'orders', label: `📋 ${t('adm.orders')}` },
          { id: 'products', label: `📦 ${t('adm.products')}` },
          { id: 'checklistdefs', label: `📁 ${t('adm.checklists')}` },
          { id: 'checklistquestions', label: `❓ ${t('adm.questions')}` },
          { id: 'smartpicks', label: `⚙️ ${t('adm.automation')}` },
          { id: 'bom', label: `🧾 ${t('adm.bom')}` },
          { id: 'people', label: `👥 ${t('adm.people')}` },
          { id: 'printer', label: `🖨️ ${t('adm.printers')}` },
        ]}
      />
      {tab === 'orders' && <AdminOrdersPanel auth={auth} />}
      {tab === 'products' && <ProductsAdmin auth={auth} />}
      {tab === 'checklistdefs' && (
        <ChecklistDefsAdmin
          auth={auth}
          onManageQuestions={(id) => {
            setChecklistId(id)
            setTab('checklistquestions')
          }}
        />
      )}
      {tab === 'checklistquestions' && <ChecklistQuestionsAdmin auth={auth} checklistId={checklistId} onChecklistChange={setChecklistId} />}
      {tab === 'smartpicks' && <AutomationAdmin auth={auth} />}
      {tab === 'bom' && <BomAdmin auth={auth} />}
      {tab === 'people' && <PeopleAdmin auth={auth} />}
      {tab === 'printer' && <PrintersAdmin auth={auth} />}
    </div>
  )
}
