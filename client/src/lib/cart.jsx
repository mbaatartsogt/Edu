import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from './user';

const KEY = 'mindedu_cart';
const Ctx = createContext(null);

function read() {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}

/**
 * Сагс — хөтөч дээр хадгалагдана (нэвтрээгүй үед ч нэмж болно).
 * Мөр бүр: { key, programId, childName, childAge, branchId }
 * Үнийг сервер өөрөө тооцдог тул энд хадгалахгүй.
 */
export function CartProvider({ children }) {
  const { user, ready } = useUser();
  const [items, setItems] = useState(read);
  const hadUser = useRef(false);

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* ignore */ } }, [items]);

  // Өөр таб дээр өөрчлөгдвөл синк хийнэ
  useEffect(() => {
    const onStorage = (e) => e.key === KEY && setItems(read());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Гарах үед сагсыг цэвэрлэнэ (хамтын компьютер дээр бусдад харагдахгүй)
  useEffect(() => {
    if (!ready) return;
    if (hadUser.current && !user) setItems([]);
    hadUser.current = Boolean(user);
  }, [user, ready]);

  const add = useCallback((programId) => {
    setItems((xs) => {
      const last = xs[xs.length - 1];
      // Ихэнхдээ нэг хүүхдийг олон хөтөлбөрт бүртгэдэг тул өмнөх мөрийн мэдээллийг санал болгоно
      return [...xs, {
        key: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        programId, childName: last?.childName ?? '', childAge: last?.childAge ?? '', branchId: last?.branchId ?? '',
      }];
    });
  }, []);
  const update = useCallback((key, patch) => setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x))), []);
  const remove = useCallback((key) => setItems((xs) => xs.filter((x) => x.key !== key)), []);
  const clear = useCallback(() => setItems([]), []);
  const countOf = useCallback((programId) => items.filter((x) => x.programId === programId).length, [items]);

  const value = useMemo(() => ({ items, count: items.length, add, update, remove, clear, countOf }), [items, add, update, remove, clear, countOf]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCart = () => useContext(Ctx);
