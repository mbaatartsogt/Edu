import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../../lib/api';
import { Field } from '../../components/admin/fields';
import Icon from '../../components/ui/Icon';

/** Хөтөлбөр, багш, салбарыг ижил аргаар удирдах ерөнхий хуудас */
export default function ResourcePage({ config }) {
  const { resource, title, description, fields, defaults, preview, addLabel } = config;
  const { flash } = useOutletContext();
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // { id?: string, data: {} }
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const filter = config.filter; // { field, options: [{ value, label }] } — жишээ нь хөтөлбөрөөр шүүх
  const [filterVal, setFilterVal] = useState('all');
  const keyOf = (x) => x[filter?.field] ?? '';
  const shown = filter && filterVal !== 'all' ? items.filter((x) => keyOf(x) === filterVal) : items;

  const fail = useCallback((err) => {
    if (err.status === 401) return nav('/admin/login', { replace: true });
    flash(err.message, 'error');
  }, [flash, nav]);

  useEffect(() => {
    setLoading(true); setError('');
    api.list(resource)
      .then(setItems)
      .catch((err) => (err.status === 401 ? nav('/admin/login', { replace: true }) : setError(err.message)))
      .finally(() => setLoading(false));
  }, [resource, nav]);

  const openNew = () => {
    setErrors({});
    setEditing({ data: { ...defaults, ...(filter && filterVal !== 'all' ? { [filter.field]: filterVal } : {}) } });
  };
  const openEdit = (item) => { setErrors({}); setEditing({ id: item.id, data: { ...item } }); };
  const close = () => !saving && setEditing(null);

  async function save(e) {
    e.preventDefault();
    setSaving(true); setErrors({});
    const { id, data } = editing;
    const payload = Object.fromEntries(fields.map((f) => [f.name, data[f.name]]));
    try {
      if (id) {
        const updated = await api.update(resource, id, payload);
        setItems((xs) => xs.map((x) => (x.id === id ? updated : x)));
      } else {
        const created = await api.create(resource, payload);
        setItems((xs) => [...xs, created]);
      }
      setEditing(null);
      flash('Хадгаллаа. Сайт дээр шууд харагдана.');
    } catch (err) {
      if (err.body?.errors) setErrors(err.body.errors);
      else fail(err);
    } finally {
      setSaving(false);
    }
  }

  async function move(index, dir) {
    // Шүүлттэй үед харагдаж буй хоёр мөрийн байрыг бүтэн жагсаалтад солино
    const a = shown[index], b = shown[index + dir];
    if (!a || !b) return;
    const next = [...items];
    const ia = next.indexOf(a), ib = next.indexOf(b);
    [next[ia], next[ib]] = [next[ib], next[ia]];
    const prev = items;
    setItems(next);
    try { await api.reorder(resource, next.map((x) => x.id)); } catch (err) { setItems(prev); fail(err); }
  }

  async function toggleVisible(item) {
    try {
      const updated = await api.update(resource, item.id, { visible: !item.visible });
      setItems((xs) => xs.map((x) => (x.id === item.id ? updated : x)));
      flash(updated.visible ? 'Сайт дээр харагдана' : 'Сайтаас нуулаа');
    } catch (err) { fail(err); }
  }

  async function remove(id) {
    setConfirmId(null);
    try {
      await api.remove(resource, id);
      setItems((xs) => xs.filter((x) => x.id !== id));
      flash('Устгалаа');
    } catch (err) { fail(err); }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">{title}</h1>
          <p className="max-w-[60ch] text-ink-soft">{description}</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 rounded-full bg-brand-blue px-5 py-3 text-sm font-bold text-white shadow-glow hover:bg-brand-royal">
          <Icon name="plus" className="h-4 w-4" strokeWidth={3} /> {addLabel}
        </button>
      </div>

      {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>}
      {!loading && config.banner?.(items)}

      {filter && !loading && items.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Шүүлт">
          {[{ value: 'all', label: 'Бүгд' }, ...filter.options].map((o) => {
            const n = o.value === 'all' ? items.length : items.filter((x) => keyOf(x) === o.value).length;
            if (o.value !== 'all' && !n && o.hideEmpty) return null;
            return (
              <button key={o.value} type="button" onClick={() => setFilterVal(o.value)} aria-pressed={filterVal === o.value}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${filterVal === o.value ? 'bg-brand-navy text-white' : 'bg-white text-ink-soft hover:text-ink'}`}>
                {o.label} <span className="ml-1 tabular-nums opacity-70">{n}</span>
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-56 animate-pulse rounded-3xl bg-white" />)}
        </div>
      ) : !shown.length ? (
        <div className="grid justify-items-center gap-3 rounded-3xl border border-dashed border-line bg-white px-6 py-14 text-center">
          <p className="font-extrabold">Одоогоор бүртгэл алга</p>
          <p className="text-sm text-ink-soft">“{addLabel}” товч дарж эхнийхээ мэдээллийг оруулна уу.</p>
        </div>
      ) : (
        <motion.ul layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence initial={false}>
            {shown.map((item, i) => (
              <motion.li key={item.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className={`flex flex-col overflow-hidden rounded-3xl border bg-white transition ${item.visible ? 'border-line' : 'border-dashed border-ink-soft/40 opacity-70'}`}>
                <div className="flex-1">{preview(item)}</div>
                <div className="flex flex-wrap items-center gap-1 border-t border-line px-3 py-2">
                  <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Дээш зөөх" className="rounded-lg p-2 text-ink-soft hover:bg-brand-mist disabled:opacity-30"><Icon name="up" className="h-4 w-4" /></button>
                  <button onClick={() => move(i, 1)} disabled={i === shown.length - 1} aria-label="Доош зөөх" className="rounded-lg p-2 text-ink-soft hover:bg-brand-mist disabled:opacity-30"><Icon name="down" className="h-4 w-4" /></button>
                  <button onClick={() => toggleVisible(item)} aria-label={item.visible ? 'Сайтаас нуух' : 'Сайт дээр харуулах'}
                    className={`ml-1 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold ${item.visible ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    <Icon name={item.visible ? 'eye' : 'eyeOff'} className="h-3.5 w-3.5" /> {item.visible ? 'Харагдана' : 'Нуусан'}
                  </button>
                  <span className="flex-1" />
                  {confirmId === item.id ? (
                    <>
                      <button onClick={() => remove(item.id)} className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white">Устгах</button>
                      <button onClick={() => setConfirmId(null)} className="rounded-full border border-line px-3 py-1.5 text-xs font-bold">Болих</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => openEdit(item)} className="flex items-center gap-1.5 rounded-full bg-brand-mist px-3 py-1.5 text-xs font-bold text-brand-royal hover:bg-brand-sky/30">
                        <Icon name="edit" className="h-3.5 w-3.5" /> Засах</button>
                      <button onClick={() => setConfirmId(item.id)} aria-label="Устгах" className="rounded-lg p-2 text-ink-soft hover:bg-red-50 hover:text-red-600"><Icon name="trash" className="h-4 w-4" /></button>
                    </>
                  )}
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}

      <AnimatePresence>
        {editing && (
          <EditDialog key="edit-dialog" title={editing.id ? 'Засах' : addLabel} fields={fields} data={editing.data} errors={errors} saving={saving}
            onChange={(name, v) => setEditing((ed) => ({ ...ed, data: { ...ed.data, [name]: v } }))}
            onSubmit={save} onClose={close} />
        )}
      </AnimatePresence>
    </div>
  );
}

function EditDialog({ title, fields, data, errors, saving, onChange, onSubmit, onClose }) {
  const panel = useRef(null);
  // onClose нь render бүрт шинээр үүсдэг тул ref-д хадгална — эс бөгөөс үсэг бичих бүрт
  // энэ effect дахин ажиллаж, курсорыг эхний талбар руу үсрүүлдэг байсан
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    // Зөвхөн нээгдэх үед, эхний бичих талбарт (зураг/файл, checkbox биш)
    panel.current?.querySelector('input:not([type=file]):not([type=checkbox]):not([type=hidden]), textarea, select')?.focus();
    const onKey = (e) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div className="absolute inset-0 bg-brand-navy/40 backdrop-blur-sm" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.form ref={panel} onSubmit={onSubmit} role="dialog" aria-modal="true" aria-labelledby="dlg-title" noValidate
        className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl"
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 id="dlg-title" className="text-xl font-extrabold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Хаах" className="rounded-xl p-2 hover:bg-brand-mist"><Icon name="close" /></button>
        </div>
        <div className="grid flex-1 content-start gap-5 overflow-y-auto px-6 py-6">
          {fields.map((f) => (
            <Field key={f.name} field={f} value={data[f.name]} error={errors[f.name]} onChange={(v) => onChange(f.name, v)}
              form={{ data, set: onChange }} />
          ))}
        </div>
        <div className="flex gap-3 border-t border-line px-6 py-4">
          <button type="submit" disabled={saving} className="flex-1 rounded-full bg-brand-blue py-3 text-sm font-extrabold uppercase tracking-wider text-white hover:bg-brand-royal disabled:opacity-60">
            {saving ? 'Хадгалж байна…' : 'Хадгалах'}
          </button>
          <button type="button" onClick={onClose} className="rounded-full border border-line px-6 py-3 text-sm font-bold">Болих</button>
        </div>
      </motion.form>
    </div>
  );
}
