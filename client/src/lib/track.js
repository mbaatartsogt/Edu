// Сайтын хандалтыг бүртгэнэ (админ хуудсыг тоолохгүй). IP биш, хөтөч дээрх санамсаргүй ID ашиглана.
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { userAuth } from './api';

const VID_KEY = 'mindedu_vid';

function visitorId() {
  try {
    let v = localStorage.getItem(VID_KEY);
    if (!v) {
      v = (crypto.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/-/g, '');
      localStorage.setItem(VID_KEY, v);
    }
    return v;
  } catch { return null; }
}

let lastPath = null;
let firstHit = true;

export function usePageTracking() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname.startsWith('/admin') || pathname === lastPath) return;
    lastPath = pathname;
    const vid = visitorId();
    if (!vid) return;
    const headers = { 'Content-Type': 'application/json' };
    if (userAuth.token) headers.Authorization = `Bearer ${userAuth.token}`;
    // Гадаад эх сурвалжийг зөвхөн анхны хуудсанд илгээнэ
    const ref = firstHit ? document.referrer : '';
    firstHit = false;
    fetch('/api/track', { method: 'POST', headers, keepalive: true, body: JSON.stringify({ vid, path: pathname, ref }) }).catch(() => {});
  }, [pathname]);
}
