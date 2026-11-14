import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, userAuth } from './api';

const Ctx = createContext(null);

/** Нэвтэрсэн хэрэглэгчийн (эцэг эх) мэдээлэл — бүх хуудсанд хүртээмжтэй */
export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!userAuth.token);

  useEffect(() => {
    if (!userAuth.token) return;
    api.accountMe()
      .then((d) => setUser(d.user))
      .catch(() => userAuth.clear())
      .finally(() => setReady(true));
  }, []);

  const login = useCallback((token, u) => {
    userAuth.set(token); setUser(u); setReady(true);
    api.accountMe().then((d) => setUser(d.user)).catch(() => {}); // онооны үлдэгдлийг авна
  }, []);
  // Онооны үлдэгдэл зэргийг шинэчлэх
  const refresh = useCallback(() => api.accountMe().then((d) => { setUser(d.user); return d; }), []);
  const logout = useCallback(() => { userAuth.clear(); setUser(null); }, []);

  return <Ctx.Provider value={{ user, ready, login, logout, refresh }}>{children}</Ctx.Provider>;
}

export const useUser = () => useContext(Ctx);

export const money = (n) => `${new Intl.NumberFormat('en-US').format(Number(n) || 0)}₮`;
