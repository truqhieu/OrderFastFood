import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const MAX_ITEMS = 10;

/** Recent search terms, stored per user (or guest) in localStorage. */
export default function useSearchHistory() {
  const { user } = useAuth();
  const key = `searchHistory_${user?.id || 'guest'}`;
  const [state, setState] = useState(() => ({ key, list: JSON.parse(localStorage.getItem(key) || '[]') }));
  const history = state.key === key ? state.list : JSON.parse(localStorage.getItem(key) || '[]');

  const save = (list) => {
    setState({ key, list });
    localStorage.setItem(key, JSON.stringify(list));
  };

  const add = (term) => {
    const t = term.trim();
    if (!t) return;
    save([t, ...history.filter((h) => h.toLowerCase() !== t.toLowerCase())].slice(0, MAX_ITEMS));
  };

  return {
    history,
    add,
    remove: (term) => save(history.filter((h) => h !== term)),
    clear: () => save([]),
  };
}
