import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useContent } from '../../lib/content';
import { api } from '../../lib/api';
import { buildIntents, isPhone, matchIntent } from '../../lib/chatbot';
import Icon from '../ui/Icon';

const TEASER_KEY = 'mindedu_chat_teaser_seen';
const CANCEL = [{ label: 'Болих', kind: 'cancel' }];
const PROMPTS = {
  question: 'Асуултаа энд бичнэ үү.',
  nameEnroll: 'Эцэг эх / асран хамгаалагчийн нэрийг бичнэ үү.',
  name: 'Таныг хэн гэж дуудах вэ?',
  phone: 'Холбогдох утасны дугаараа бичнэ үү (8 оронтой).',
  age: 'Хүүхэд тань хэдэн настай вэ?',
};
const PLACEHOLDER = { question: 'Асуултаа бичнэ үү', name: 'Нэрээ бичнэ үү', phone: '9911 2233', age: 'Жишээ нь: 10' };
const fmtPhone = (d) => `${d.slice(0, 4)} ${d.slice(4)}`;
let uid = 0;

/** Ярианы бөмбөлөгтэй инээмсэглэсэн дүрс */
function BubbleIcon({ className }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M7 5h18a4 4 0 014 4v11a4 4 0 01-4 4h-2v4.5L17.5 24H7a4 4 0 01-4-4V9a4 4 0 014-4z" fill="#fff" />
      <path d="M10.5 15.5c1.4 2 3.2 3 5.5 3s4.1-1 5.5-3" fill="none" stroke="rgb(var(--c-blue))" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function Avatar() {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-sky to-brand-royal text-sm font-black text-white" aria-hidden="true">
      M
    </span>
  );
}

export default function ChatWidget() {
  const content = useContent();
  const { settings } = content;
  const reduce = useReducedMotion();
  const intents = useMemo(() => buildIntents(content), [content]);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chips, setChips] = useState([]); // массив эсвэл 'menu'
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [lead, setLead] = useState(null); // { topic, step, data }
  const [teaser, setTeaser] = useState(false);
  const [unread, setUnread] = useState(false);

  const transcript = useRef([]);
  const queue = useRef(Promise.resolve());
  const started = useRef(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Үндсэн цэсний товчнууд (контент ачаалагдахад шинэчлэгдэнэ)
  const menuChips = useMemo(() => {
    const byId = Object.fromEntries(intents.map((i) => [i.id, i]));
    const faqs = intents.filter((i) => i.id.startsWith('faq-')).slice(0, 3);
    return [byId.programs, ...faqs, byId.branches, byId.enroll, byId.human]
      .filter(Boolean).map((i) => ({ label: i.label, kind: 'intent', id: i.id }));
  }, [intents]);

  /** Ботын хариуг "бичиж байна…" анимэйшнтэй дарааллаар гаргана */
  const say = useCallback((text, nextChips = null) => {
    queue.current = queue.current.then(() => new Promise((resolve) => {
      setTyping(true);
      setChips([]);
      const delay = reduce ? 120 : Math.min(450 + text.length * 7, 1400);
      setTimeout(() => {
        transcript.current.push({ from: 'bot', text });
        setTyping(false);
        setMessages((m) => [...m, { id: ++uid, from: 'bot', text }]);
        if (nextChips) setChips(nextChips);
        resolve();
      }, delay);
    }));
    return queue.current;
  }, [reduce]);

  const pushUser = (text) => {
    transcript.current.push({ from: 'user', text });
    setMessages((m) => [...m, { id: ++uid, from: 'user', text }]);
    setChips([]);
  };

  // Анх нээхэд мэндчилнэ
  useEffect(() => {
    if (!open || started.current) return;
    started.current = true;
    say(settings.chatGreeting || 'Сайн байна уу! MindEdu-гийн туслах байна. Танд юугаар туслах вэ?', 'menu');
  }, [open, say, settings.chatGreeting]);

  // Хэсэг хугацааны дараа жижиг урилга гаргана (нэг удаа)
  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(TEASER_KEY) === '1'; } catch { /* ignore */ }
    if (seen) return;
    const t = setTimeout(() => { setTeaser(true); setUnread(true); }, 9000);
    return () => clearTimeout(t);
  }, []);

  const dismissTeaser = () => {
    setTeaser(false);
    try { sessionStorage.setItem(TEASER_KEY, '1'); } catch { /* ignore */ }
  };

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  }, [messages, typing, chips, reduce]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); document.removeEventListener('keydown', onKey); };
  }, [open]);

  function toggle() {
    setOpen((o) => !o);
    setUnread(false);
    dismissTeaser();
  }

  // ---------- Мэдээлэл авах (нэр → утас → нас) ----------
  function startLead(topic, message = '') {
    if (topic === 'question' && !message) {
      setLead({ topic, step: 'question', data: {} });
      say(PROMPTS.question, CANCEL);
    } else {
      setLead({ topic, step: 'name', data: { message } });
      say(topic === 'enroll' ? PROMPTS.nameEnroll : PROMPTS.name, CANCEL);
    }
  }

  async function submitLead(topic, data) {
    setLead({ topic, step: 'sending', data });
    try {
      await api.sendChat({ ...data, topic, transcript: transcript.current });
      transcript.current = []; // дараагийн хүсэлтэд зөвхөн шинэ яриа хадгалагдана
      say(`Баярлалаа, ${data.name}! Таны мэдээллийг хүлээн авлаа. Манай ажилтан ${fmtPhone(data.phone)} дугаарт удахгүй холбогдоно.`, 'menu');
    } catch {
      say(`Уучлаарай, илгээж чадсангүй.${settings.phone ? ` ${settings.phone} утсаар холбогдоно уу.` : ' Түр хүлээгээд дахин оролдоно уу.'}`, 'menu');
    } finally {
      setLead(null);
    }
  }

  function handleLeadInput(text) {
    const { topic, step, data } = lead;
    if (step === 'question') {
      setLead({ topic, step: 'name', data: { ...data, message: text } });
      return say(PROMPTS.name, CANCEL);
    }
    if (step === 'name') {
      if (text.trim().length < 2) return say('Нэрээ бичнэ үү.', CANCEL);
      setLead({ topic, step: 'phone', data: { ...data, name: text.trim() } });
      return say(PROMPTS.phone, CANCEL);
    }
    if (step === 'phone') {
      if (!isPhone(text)) return say('Утасны дугаар 8 оронтой байх ёстой. Жишээ нь: 9911 2233', CANCEL);
      const next = { ...data, phone: text.replace(/\D/g, '') };
      if (topic === 'enroll') {
        setLead({ topic, step: 'age', data: next });
        return say(PROMPTS.age, CANCEL);
      }
      return submitLead(topic, next);
    }
    if (step === 'age') {
      const n = parseInt(text.replace(/\D/g, ''), 10);
      if (!n || n < 3 || n > 25) return say('Насыг тоогоор бичнэ үү. Жишээ нь: 10', CANCEL);
      if (n < 8 || n > 18) say('Манай хөтөлбөрүүд 8–18 насныханд зориулагдсан. Ажилтан тантай ярилцаад зөвлөгөө өгнө.');
      return submitLead(topic, { ...data, age: n });
    }
  }

  // ---------- Хариулт ----------
  function handleIntent(intent, userText) {
    const r = intent.reply();
    if (r.lead) { say(r.text); return startLead(r.lead); }
    if (r.offerLead) {
      say(r.text);
      return say(r.leadPrompt || 'Утасны дугаараа үлдээвэл манай ажилтан холбогдоно. Үлдээх үү?', [
        { label: 'Тийм, үлдээе', kind: 'lead', topic: r.leadTopic || 'price', message: r.leadTopic === 'enroll' ? '' : (userText || intent.question) },
        { label: 'Үгүй, баярлалаа', kind: 'no' },
      ]);
    }
    say(r.text, 'menu');
  }

  function send(raw) {
    const text = raw.trim();
    if (!text || typing || lead?.step === 'sending') return;
    pushUser(text);
    setInput('');
    if (lead) return handleLeadInput(text);
    const intent = matchIntent(text, intents);
    if (intent) return handleIntent(intent, text);
    say('Уучлаарай, энэ асуултад би шууд хариулж чадсангүй. Нэр, утасны дугаараа үлдээвэл манай ажилтан хариулна.');
    startLead('question', text);
  }

  function pickChip(c) {
    if (typing) return;
    pushUser(c.label);
    if (c.kind === 'intent') {
      const it = intents.find((i) => i.id === c.id);
      if (it) handleIntent(it);
    } else if (c.kind === 'lead') {
      startLead(c.topic, c.message);
    } else if (c.kind === 'cancel') {
      setLead(null);
      say('За, болилоо. Өөр юугаар туслах вэ?', 'menu');
    } else if (c.kind === 'no') {
      say('За. Өөр асуух зүйл гарвал бичээрэй.', 'menu');
    }
  }

  function restart() {
    if (typing) return;
    transcript.current = [];
    setMessages([]);
    setLead(null);
    say(settings.chatGreeting || 'Танд юугаар туслах вэ?', 'menu');
  }

  const visibleChips = chips === 'menu' ? menuChips : chips;
  const step = lead?.step;
  const edge = { right: 'max(16px, calc(env(safe-area-inset-right, 0px) + 16px))', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div key="chat-panel" role="dialog" aria-label="MindEdu чат" aria-modal="false"
            className="fixed z-[65] flex w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_-20px_rgba(10,42,122,.55)] ring-1 ring-brand-navy/10"
            style={{ ...edge, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 92px)', height: 'min(600px, calc(100dvh - 120px))', transformOrigin: 'bottom right' }}
            initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}>

            {/* Толгой */}
            <div className="bg-grid-blue relative flex items-center gap-3 px-5 py-4 text-white">
              <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-white/15 font-black backdrop-blur">
                M<span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-brand-blue bg-emerald-400" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold leading-tight">MindEdu туслах</p>
                <p className="truncate text-xs text-white/80">Автомат хариулагч · ажилтан удахгүй холбогдоно</p>
              </div>
              <button onClick={restart} aria-label="Шинээр эхлэх" title="Шинээр эхлэх" className="grid h-9 w-9 place-items-center rounded-xl hover:bg-white/15">
                <Icon name="refresh" className="h-4 w-4" />
              </button>
              <button onClick={toggle} aria-label="Чат хаах" className="grid h-9 w-9 place-items-center rounded-xl hover:bg-white/15">
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            {/* Мессежүүд */}
            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-brand-mist/50 px-4 py-5" aria-live="polite">
              {messages.map((m) => (
                <motion.div key={m.id} className={`flex items-end gap-2 ${m.from === 'user' ? 'justify-end' : ''}`}
                  initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  {m.from === 'bot' && <Avatar />}
                  <p className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-[.92rem] leading-relaxed
                    ${m.from === 'user' ? 'rounded-br-md bg-brand-blue text-white' : 'rounded-bl-md bg-white text-ink shadow-sm'}`}>
                    {m.text}
                  </p>
                </motion.div>
              ))}
              {typing && (
                <div className="flex items-end gap-2" aria-label="Бичиж байна">
                  <Avatar />
                  <span className="flex gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3.5 shadow-sm">
                    {[0, 1, 2].map((i) => (
                      <motion.i key={i} className="h-2 w-2 rounded-full bg-brand-sky"
                        animate={reduce ? undefined : { y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
                    ))}
                  </span>
                </div>
              )}
              {!typing && visibleChips.length > 0 && (
                <motion.div className="flex flex-wrap gap-2 pl-10" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
                  {visibleChips.map((c) => (
                    <button key={c.label} onClick={() => pickChip(c)}
                      className={`rounded-full border-2 px-3.5 py-1.5 text-[.82rem] font-semibold transition hover:-translate-y-0.5
                        ${c.kind === 'cancel' || c.kind === 'no' ? 'border-line bg-white text-ink-soft hover:border-ink-soft/40' : 'border-brand-blue/30 bg-white text-brand-blue hover:border-brand-blue hover:bg-brand-blue hover:text-white'}`}>
                      {c.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Бичих хэсэг */}
            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t border-line bg-white p-3">
              <div className="flex items-center gap-2 rounded-2xl bg-brand-mist pl-4 pr-1.5 focus-within:ring-2 focus-within:ring-brand-blue">
                <label htmlFor="chat-input" className="sr-only">Мессеж</label>
                <input id="chat-input" ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
                  type={step === 'phone' ? 'tel' : 'text'} inputMode={step === 'phone' || step === 'age' ? 'numeric' : 'text'}
                  autoComplete={step === 'phone' ? 'tel' : step === 'name' ? 'name' : 'off'} maxLength={500}
                  placeholder={PLACEHOLDER[step] ?? 'Асуултаа бичнэ үү…'}
                  className="min-w-0 flex-1 bg-transparent py-3 text-[.95rem] text-ink outline-none placeholder:text-ink-soft/60" />
                <button type="submit" disabled={!input.trim() || typing} aria-label="Илгээх"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-blue text-white transition hover:bg-brand-royal disabled:opacity-40">
                  <Icon name="arrow" className="h-[18px] w-[18px]" strokeWidth={2.8} />
                </button>
              </div>
              <p className="mt-2 text-center text-[.7rem] text-ink-soft">Таны мэдээллийг зөвхөн холбогдох зорилгоор ашиглана.</p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Урилга */}
      <AnimatePresence>
        {teaser && !open && (
          <motion.div key="chat-teaser" className="fixed z-[64] w-[min(260px,calc(100vw-110px))]"
            style={{ ...edge, right: 'max(88px, calc(env(safe-area-inset-right, 0px) + 88px))', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
            initial={{ opacity: 0, x: 20, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
            <button onClick={toggle} className="w-full rounded-2xl rounded-br-md bg-white p-4 pr-9 text-left text-sm font-semibold text-ink shadow-[0_16px_40px_-12px_rgba(10,42,122,.45)]">
              Сайн байна уу! Хөтөлбөр, төлбөрийн талаар асуух зүйл байна уу?
            </button>
            <button onClick={dismissTeaser} aria-label="Хаах" className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg text-ink-soft hover:bg-brand-mist">
              <Icon name="close" className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Чат товч */}
      <motion.button onClick={toggle} aria-label={open ? 'Чат хаах' : 'Чат нээх — асуулт асуух'} aria-expanded={open}
        className="fixed z-[65] grid h-[60px] w-[60px] place-items-center rounded-full bg-gradient-to-br from-brand-sky via-brand-blue to-brand-royal text-white shadow-[0_14px_30px_-8px_rgb(var(--c-blue)/.75)]"
        style={edge}
        initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 1 }}
        whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}>
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <Icon name="close" className="h-7 w-7" strokeWidth={2.6} />
            </motion.span>
          ) : (
            <motion.span key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <BubbleIcon className="h-8 w-8" />
            </motion.span>
          )}
        </AnimatePresence>
        {unread && !open && <span className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full border-[3px] border-white bg-brand-yellow" aria-hidden="true" />}
      </motion.button>
    </>
  );
}
