function StarMark({ index, active, interactive, onChange }) {
  const className = active ? 'star on' : 'star';

  if (interactive) {
    return (
      <button type="button" className={className} onClick={() => onChange(index)}>
        ★
      </button>
    );
  }

  return <span className={className}>★</span>;
}

export default function Stars({ value = 0, count, size = 14 }) {
  const rounded = Math.round(value);
  return (
    <span className="stars" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((index) => (
        <StarMark key={index} index={index} active={index <= rounded} />
      ))}
      <b>{Number(value).toFixed(1)}</b>
      {count !== undefined && <span className="muted">({count})</span>}
    </span>
  );
}

export function StarInput({ value, onChange, size = 28 }) {
  return (
    <span className="stars star-input" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((index) => (
        <StarMark key={index} index={index} active={index <= value} interactive onChange={onChange} />
      ))}
    </span>
  );
}
