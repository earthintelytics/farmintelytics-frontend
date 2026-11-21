// One look for the count cards (Geospatial Intel, Worker Analytics): big number, short coloured label, no icon.
// fixed: 8 in one line on wide screens, 4 per row on laptops, 2 on phones (.stat-cards--fixed); without it the
// cards fill the row (auto-fit). loading shows a dash instead of the numbers.
export default function StatCards({ items, className = '', fixed = false, loading = false }) {
  return (
    <div className={`stat-cards${fixed ? ' stat-cards--fixed' : ''} ${className}`.trim()}>
      {items.map(k => (
        <div key={k.label} className="stat-card" title={k.title}>
          <div className="stat-card__value">
            {loading ? '—' : k.value}
            {!loading && k.unit ? <span className="stat-card__unit">{k.unit}</span> : null}
          </div>
          <div className="stat-card__label" style={{ color: k.color }}>{k.label}</div>
        </div>
      ))}
    </div>
  );
}
