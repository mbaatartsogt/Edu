import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';
import { fallbackSettings } from '../data/content';

const Ctx = createContext(null);

/**
 * Нүүр хуудасны контентыг (хөтөлбөр, багш, салбар, тохиргоо) серверээс нэг удаа татна.
 * loading үед жагсаалтууд хоосон, settings нь fallback утгатай байна.
 */
export function ContentProvider({ children }) {
  const [state, setState] = useState({
    loading: true, error: false,
    settings: fallbackSettings, programs: [], teachers: [], branches: [], faqs: [],
  });

  useEffect(() => {
    let alive = true;
    api.content()
      .then((d) => alive && setState({ loading: false, error: false, ...d, settings: { ...fallbackSettings, ...d.settings } }))
      .catch(() => alive && setState((s) => ({ ...s, loading: false, error: true })));
    return () => { alive = false; };
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useContent = () => useContext(Ctx);

/** "9119-1971" → "+97691191971" (tel: холбоосонд) */
export const telHref = (phone) => {
  const d = String(phone || '').replace(/\D/g, '');
  return `tel:${d.length === 8 ? '+976' + d : d}`;
};
