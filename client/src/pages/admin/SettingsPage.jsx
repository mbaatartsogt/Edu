import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { api } from '../../lib/api';
import { Field } from '../../components/admin/fields';
import Icon, { FacebookIcon } from '../../components/ui/Icon';
import { seasons, weatherModes } from '../../data/seasons';

const socialFields = [
  { name: 'facebook', label: 'Facebook', icon: <FacebookIcon />, placeholder: 'https://www.facebook.com/mindedu' },
  { name: 'instagram', label: 'Instagram', icon: <Icon name="instagram" />, placeholder: 'https://www.instagram.com/mindedu.mn' },
  { name: 'threads', label: 'Threads', icon: <Icon name="threads" />, placeholder: 'https://www.threads.net/@mindedu.mn' },
  { name: 'messenger', label: 'Messenger', icon: <Icon name="messenger" />, placeholder: 'https://m.me/mindedu', help: 'Facebook хуудасны хаягийн сүүлийн хэсгийг m.me/-ийн ард бичнэ.' },
];

const contactFields = [
  { name: 'phone', label: 'Утас', placeholder: '9119-1971', help: 'Header, бүртгэлийн хэсэг, салбаруудын доод талд болон footer-т гарна.' },
  { name: 'email', label: 'И-мэйл', inputType: 'email', placeholder: 'manager@mindedu.mn' },
  { name: 'hours', label: 'Ажлын цаг', placeholder: 'Даваа–Бямба · 10:00–20:00' },
  { name: 'address', label: 'Төв салбарын хаяг (footer)', type: 'textarea', rows: 3 },
  { name: 'mapUrl', label: 'Google Maps холбоос (footer)', inputType: 'url', placeholder: 'https://maps.app.goo.gl/…' },
];

const pointFields = [
  { name: 'pointsPer1000', label: 'Төлбөрийн 1,000₮ тутамд олгох оноо', inputType: 'number', help: 'Жишээ нь 1 бол 250,000₮ төлөхөд 250 оноо.' },
  { name: 'pointsSignup', label: 'Бүртгэл баталгаажуулахад олгох оноо', inputType: 'number' },
];

const heroStyles = [
  { value: 'mosaic', label: 'Мозайк баннер', desc: 'Хүүхдүүдийн зураг, гялалзах мозайк, хөвөх картууд.', preview: 'bg-white',
    art: <><span className="absolute inset-y-0 right-0 w-3/5 bg-[linear-gradient(90deg,transparent,#0A6CF5_40%)]" /><span className="absolute right-[12%] top-[12%] grid grid-cols-4 gap-0.5">{Array.from({ length: 8 }, (_, i) => <span key={i} className={`h-3 w-3 ${i % 3 ? 'bg-white/70' : 'bg-brand-yellow'}`} />)}</span><span className="absolute left-[10%] top-[38%] h-2 w-[34%] rounded bg-brand-blue" /><span className="absolute left-[10%] top-[52%] h-2 w-[28%] rounded bg-brand-blue" /><span className="absolute left-[10%] top-[70%] h-3 w-[20%] rounded-full bg-brand-blue" /></> },
  { value: 'follow', label: 'Курсор дагадаг дүр', desc: 'Маскот хүүхэд толгой, нүдээрээ курсорыг дагаж харна, гараа даллана.', preview: 'bg-[#F3F5F9]',
    art: <><span className="absolute bottom-[14%] left-[8%] text-[1.3rem] font-black leading-none text-ink">BETTER<br />EVERY</span><span className="absolute bottom-0 left-1/2 h-[56%] w-[22%] -translate-x-1/2 rounded-t-[40%] bg-brand-yellow" /><span className="absolute bottom-[50%] left-1/2 h-[30%] w-[20%] -translate-x-1/2 rounded-full bg-[#F6CBA5]"><span className="absolute left-[30%] top-[45%] h-1.5 w-1.5 rounded-full bg-ink" /><span className="absolute right-[22%] top-[45%] h-1.5 w-1.5 rounded-full bg-ink" /></span><span className="absolute bottom-[72%] left-1/2 h-[12%] w-[22%] -translate-x-1/2 rounded-t-full bg-brand-blue" /></> },
  { value: 'letters', label: 'Соронзон үсэг', desc: 'Том гарчгийн үсгүүд курсороос түлхэгдэж, англи үгс хөвнө.', preview: 'bg-grid-blue',
    art: <><span className="text-lg font-black tracking-tight text-white">BE<span className="inline-block -translate-y-1 rotate-12 text-brand-yellow">T</span>T<span className="inline-block translate-y-1 -rotate-6">E</span>R</span><span className="absolute left-[10%] top-[16%] rounded-full bg-white/20 px-1.5 text-[.55rem] font-bold text-white">Hello!</span><span className="absolute bottom-[16%] right-[10%] rounded-full bg-white/20 px-1.5 text-[.55rem] font-bold text-white">ABC</span></> },
];

const chatFields = [
  { name: 'chatGreeting', label: 'Чат-ботын мэндчилгээ', type: 'textarea', rows: 3, help: 'Хэрэглэгч чат нээхэд хамгийн эхэнд гарах мессеж.' },
];

export default function SettingsPage() {
  const { flash } = useOutletContext();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api.settings().then(setData).catch((err) => (err.status === 401 ? nav('/admin/login', { replace: true }) : setLoadError(err.message)));
  }, [nav]);

  const set = (k) => (v) => {
    setData((d) => ({ ...d, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  async function save(e) {
    e.preventDefault();
    setSaving(true); setErrors({});
    try {
      setData(await api.saveSettings(data));
      flash('Хадгаллаа. Сайт дээр шууд харагдана.');
    } catch (err) {
      if (err.body?.errors) { setErrors(err.body.errors); flash('Алдаатай талбарыг засна уу', 'error'); }
      else if (err.status === 401) nav('/admin/login', { replace: true });
      else flash(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loadError) return <p role="alert" className="rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{loadError}</p>;
  if (!data) return <div className="h-96 animate-pulse rounded-3xl bg-white" />;

  return (
    <form onSubmit={save} noValidate className="grid gap-6">
      <div>
        <h1 className="text-3xl font-extrabold">Холбоос, холбоо барих</h1>
        <p className="text-ink-soft">Сайтын footer болон бусад хэсэгт гарах мэдээлэл.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="grid content-start gap-5 rounded-3xl border border-line bg-white p-6">
          <div>
            <h2 className="text-lg font-extrabold">Сошиал холбоос</h2>
            <p className="text-sm text-ink-soft">Хоосон орхисон холбоосын дүрс сайт дээр гарахгүй.</p>
          </div>
          {socialFields.map((f) => (
            <div key={f.name} className="flex items-start gap-3">
              <span className="mt-7 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-mist text-brand-blue">{f.icon}</span>
              <div className="min-w-0 flex-1">
                <Field field={{ ...f, inputType: 'url' }} value={data[f.name]} error={errors[f.name]} onChange={set(f.name)} />
              </div>
            </div>
          ))}
        </section>

        <section className="grid content-start gap-5 rounded-3xl border border-line bg-white p-6">
          <h2 className="text-lg font-extrabold">Холбоо барих</h2>
          {contactFields.map((f) => (
            <Field key={f.name} field={f} value={data[f.name]} error={errors[f.name]} onChange={set(f.name)} />
          ))}
        </section>
      </div>

      <section className="grid content-start gap-5 rounded-3xl border border-line bg-white p-6">
        <div>
          <h2 className="text-lg font-extrabold">Нүүр хэсгийн загвар (header)</h2>
          <p className="text-sm text-ink-soft">Сайтын хамгийн дээд хэсгийн хөдөлгөөнт загвар. Хадгалсны дараа нүүр хуудсыг шинэчилж (refresh) харна.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3" role="radiogroup" aria-label="Нүүр хэсгийн загвар">
          {heroStyles.map((h) => {
            const on = (data.heroStyle || 'mosaic') === h.value;
            return (
              <button key={h.value} type="button" role="radio" aria-checked={on} onClick={() => set('heroStyle')(h.value)}
                className={`grid gap-3 rounded-2xl border-2 p-3 text-left transition ${on ? 'border-brand-blue bg-brand-mist/60' : 'border-line hover:border-brand-sky'}`}>
                <span className={`relative grid aspect-[16/9] place-items-center overflow-hidden rounded-xl ${h.preview}`} aria-hidden="true">{h.art}</span>
                <span className="flex items-start gap-2">
                  <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${on ? 'border-brand-blue bg-brand-blue' : 'border-line'}`}>
                    {on && <span className="h-2 w-2 rounded-full bg-white" />}
                  </span>
                  <span><b className="block text-sm font-extrabold">{h.label}</b><span className="text-xs text-ink-soft">{h.desc}</span></span>
                </span>
              </button>
            );
          })}
        </div>
        {(data.heroStyle || 'mosaic') === 'mosaic' && (
          <Field field={{ name: 'heroImage', label: 'Баннер зураг', type: 'image', maxSize: 2400, aspect: 'aspect-[15/8]',
            help: 'Хэвтээ зураг (жишээ 1800×960). Текстийг сайт өөрөө зүүн талд бичдэг тул зурагтаа текст бүү оруул. Хоосон бол анхдагч баннер харагдана.' }}
            value={data.heroImage} error={errors.heroImage} onChange={set('heroImage')} />
        )}
        {data.heroStyle === 'follow' && (
          <Field field={{ name: 'heroCharacter', label: 'Өөрийн дүр (заавал биш)', type: 'image', maxSize: 1400, aspect: 'aspect-[4/5]',
            help: 'Хоосон бол MindEdu-гийн маскот хүүхэд нүд, толгойгоороо курсорыг дагана. Дэвсгэргүй (тунгалаг PNG) 3D дүр/хүний зураг оруулбал тэр нь курсор руу эргэж хөдөлнө.' }}
            value={data.heroCharacter} error={errors.heroCharacter} onChange={set('heroCharacter')} />
        )}
      </section>

      <section className="grid content-start gap-5 rounded-3xl border border-line bg-white p-6">
        <div>
          <h2 className="text-lg font-extrabold">Сайтын загвар ба эффект</h2>
          <p className="text-sm text-ink-soft">Баярын үеэр сайтын өнгө, мэндчилгээ, чимэглэл өөрчлөгдөнө. Хадгалсны дараа нүүр хуудсыг шинэчилж (refresh) харна.</p>
        </div>
        <Field field={{ name: 'seasonTheme', label: 'Баярын загвар', type: 'theme', themes: seasons }} value={data.seasonTheme || 'default'} error={errors.seasonTheme} onChange={set('seasonTheme')} />
        <Field field={{ name: 'weatherMode', label: 'Цаг агаарын эффект', type: 'select', options: weatherModes,
          help: 'Автомат үед гадаа бороо орвол сайт дээр бороо, цас орвол цас, салхи хүчтэй (30+ км/ц) бол салхи гарна. 15 минут тутам шинэчлэгдэнэ.' }}
          value={data.weatherMode || 'auto'} error={errors.weatherMode} onChange={set('weatherMode')} />
      </section>

      <section className="grid content-start gap-5 rounded-3xl border border-line bg-white p-6">
        <div>
          <h2 className="text-lg font-extrabold">MindPoint оноо</h2>
          <p className="text-sm text-ink-soft">Оноог хэрэглэгч бүрт гараар нэмэх/хасахыг “Хэрэглэгчид, оноо” хэсгээс хийнэ.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {pointFields.map((f) => (
            <Field key={f.name} field={f} value={data[f.name]} error={errors[f.name]} onChange={set(f.name)} />
          ))}
        </div>
      </section>

      <section className="grid content-start gap-5 rounded-3xl border border-line bg-white p-6">
        <h2 className="text-lg font-extrabold">Чат-бот</h2>
        {chatFields.map((f) => (
          <Field key={f.name} field={f} value={data[f.name]} error={errors[f.name]} onChange={set(f.name)} />
        ))}
      </section>

      <div className="sticky bottom-4 flex justify-end">
        <button type="submit" disabled={saving}
          className="rounded-full bg-brand-blue px-8 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white shadow-glow hover:bg-brand-royal disabled:opacity-60">
          {saving ? 'Хадгалж байна…' : 'Хадгалах'}
        </button>
      </div>
    </form>
  );
}
