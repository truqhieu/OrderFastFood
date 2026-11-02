import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

/**
 * Server-side paginated query against json-server. Page resets to 1 whenever `path` changes.
 * Pass `path = null` to skip fetching.
 */
export default function usePaged(path, limit = 6, { pollMs = 0 } = {}) {
  const [pageState, setPageState] = useState({ path, page: 1 });
  const page = pageState.path === path ? pageState.page : 1;
  const [state, setState] = useState({ data: [], total: 0, loading: true, error: '' });

  const setPage = useCallback((p) => setPageState({ path, page: p }), [path]);

  const load = useCallback(async () => {
    if (!path) return setState({ data: [], total: 0, loading: false, error: '' });
    try {
      const { data, total } = await api.getPaged(path, page, limit);
      if (data.length === 0 && page > 1) return setPage(page - 1);
      setState({ data, total, loading: false, error: '' });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message }));
    }
  }, [path, page, limit, setPage]);

  useEffect(() => {
    load();
    if (!pollMs) return;
    const timer = setInterval(load, pollMs);
    return () => clearInterval(timer);
  }, [load, pollMs]);

  return {
    ...state,
    page,
    setPage,
    totalPages: Math.max(1, Math.ceil(state.total / limit)),
    reload: load,
  };
}
