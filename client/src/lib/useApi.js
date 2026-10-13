import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

/** GET so'rovi uchun oddiy hook: { data, error, loading, reload } */
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  const load = useCallback(() => {
    if (!path) return;
    setState((s) => ({ ...s, loading: true }));
    api
      .get(path)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => setState({ data: null, error, loading: false }));
  }, [path]);

  useEffect(load, [load]);

  return { ...state, reload: load };
}
