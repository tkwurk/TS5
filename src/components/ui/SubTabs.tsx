/** Pill-style sub-navigation inside a screen. */
export function SubTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[]
  active: T
  onChange: (id: T) => void
}) {
  return (
    <div className="ui-subtabs">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={'ui-subtab' + (t.id === active ? ' ui-subtab--active' : '')}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
