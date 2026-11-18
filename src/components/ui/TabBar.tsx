/** Simple tab navigation. Generic over the tab id string union. */
export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string; icon?: string }[]
  active: T
  onChange: (id: T) => void
}) {
  return (
    <nav className="ui-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={'ui-tab' + (tab.id === active ? ' ui-tab--active' : '')}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon && <span className="ui-tab__icon">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
