export default function Stars({ value = 0, count, size = 14 }) {
  const rounded = Math.round(value);
  return (
    <span className="stars" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rounded ? 'star on' : 'star'}>★</span>
      ))}
      <b>{Number(value).toFixed(1)}</b>
      {count !== undefined && <span className="muted">({count})</span>}
    </span>
  );
}

export function StarInput({ value, onChange, size = 28 }) {
  return (
    <span className="stars star-input" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button type="button" key={i} className={i <= value ? 'star on' : 'star'} onClick={() => onChange(i)}>
          ★
        </button>
      ))}
    </span>
  );
}
