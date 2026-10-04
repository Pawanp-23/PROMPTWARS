import { useEffect, useState } from 'react';
import type { SavedSummary } from '../../../shared/schema';
import { loadSummary } from '../lib/api';

export type SharedState =
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'ready'; summary: SavedSummary }
  | { status: 'error'; message: string };

/** Reads `?s=<id>` from the URL and loads that saved reasoning summary. */
export function useSharedSummary(search: string = window.location.search): SharedState {
  const id = new URLSearchParams(search).get('s');
  const [state, setState] = useState<SharedState>(id ? { status: 'loading' } : { status: 'none' });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    loadSummary(id)
      .then((summary) => !cancelled && setState({ status: 'ready', summary }))
      .catch((err: Error) => !cancelled && setState({ status: 'error', message: err.message }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  return state;
}
