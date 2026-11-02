function pageItems(page, totalPages) {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push('…' + p);
    result.push(p);
  });
  return result;
}

export default function Pagination({ page, totalPages, onChange, total }) {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination">
      <button disabled={page === 1} onClick={() => onChange(page - 1)}>‹</button>
      {pageItems(page, totalPages).map((p) =>
        typeof p === 'string' ? (
          <span key={p} className="ellipsis">…</span>
        ) : (
          <button key={p} className={p === page ? 'active' : ''} onClick={() => onChange(p)}>
            {p}
          </button>
        )
      )}
      <button disabled={page === totalPages} onClick={() => onChange(page + 1)}>›</button>
      {total !== undefined && <span className="muted small">{total} kết quả</span>}
    </div>
  );
}
