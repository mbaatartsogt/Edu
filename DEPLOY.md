# MindEdu-г үнэгүй байршуулах заавар (GitHub + Neon + Render)

Нийт ~20 минут. Бүгд үнэгүй, банкны карт шаардахгүй.

| Юу | Хаана | Үүрэг |
|---|---|---|
| Код | **GitHub** | Кодыг хадгална. Шинэчлэлт оруулахад сайт автоматаар шинэчлэгдэнэ |
| Өгөгдлийн сан | **Neon.tech** | PostgreSQL (хэрэглэгч, захиалга, зураг…). Үнэгүй, хугацаагүй |
| Сайт | **Render.com** | Сайт + API-г ажиллуулна. Хаяг: `https://mindedu.onrender.com` маягийн |

---

## 1. GitHub-д код оруулах

1. https://github.com дээр бүртгүүлж нэвтэрнэ.
2. Баруун дээд буланд **+** → **New repository**.
   - Repository name: `mindedu`
   - **Private** сонгож болно (Render private repo-г уншиж чадна)
   - “Add a README” гэснийг **бүү** чагтал → **Create repository**.
3. Кодоо оруулах — аль нэг аргаар:

   **А. Хөтчөөр — 2 удаа хувааж** (GitHub нэг удаад 100 файл л авдаг, төсөл ~105 файлтай)
   - `mindedu_XX.zip`-ийг компьютер дээрээ **задлана** (Extract All). zip-ээ шууд оруулж болохгүй.
   - Компьютерийн **Chrome эсвэл Edge** ашиглана (утаснаас хавтас оруулах боломжгүй).
   - **1-р удаа:** repo хуудсан дээрх **“uploading an existing file”** (эсвэл **Add file → Upload files**) дарна.
     Задалсан `mindedu` хавтсыг нээгээд **`client`-ээс бусад бүгдийг** (`server` хавтас, `package.json`, `package-lock.json`,
     `render.yaml`, `README.md`, `DEPLOY.md`, `docker-compose.yml`) хулганаар **чирж** хуудсан дээр тавина → **Commit changes**.
   - **2-р удаа:** дахин **Add file → Upload files** → `client` хавтсыг бүхэлд нь **чирж** тавина → **Commit changes**.
   - ⚠️ “choose your files” цонхоор хавтас сонгогддоггүй — заавал **Explorer/Finder-ээс чирж** оруулна.
   - Шалгах: repo-ийн нүүрэнд `client`, `server`, `package.json`, `render.yaml` харагдаж байх ёстой
     (`mindedu` гэсэн нэг хавтас дотор биш, шууд repo-ийн үндсэн дээр).

   **Б. Git командаар** (компьютер дээр git суусан бол)
   ```bash
   cd mindedu
   git init
   git add .
   git commit -m "MindEdu сайт"
   git branch -M main
   git remote add origin https://github.com/ТАНЫ-НЭР/mindedu.git
   git push -u origin main
   ```

   **В. GitHub Desktop** програмаар: File → Add local repository → `mindedu` хавтас → Publish repository.

---

## 2. Neon дээр өгөгдлийн сан үүсгэх

1. https://neon.tech → **Sign up** (GitHub-ээр нэвтэрч болно).
2. **Create project**:
   - Project name: `mindedu`
   - Region: **AWS Asia Pacific (Singapore)** — Монголд хамгийн ойр
   - Postgres version: 16 эсвэл 17
3. Үүссэний дараа **Connect** товч → **Connection string**-ийг хуулна. Иймэрхүү харагдана:
   ```
   postgresql://neondb_owner:xxxxxxxx@ep-cool-name-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
   Үүнийг дараагийн алхамд хэрэглэнэ. **Хэнд ч бүү үзүүл** (нууц үг агуулсан).

Хүснэгтүүдийг гараар үүсгэх шаардлагагүй — сайт анх асахдаа өөрөө үүсгэж, жишээ контент оруулна.

---

## 3. Render дээр сайтаа асаах

1. https://render.com → **Get Started** → **GitHub-ээр** нэвтэрнэ (repo-доо хандах эрх өгнө).
2. Dashboard → **New +** → **Blueprint**.
3. `mindedu` repo-гоо сонгоно → Render `render.yaml` файлыг автоматаар уншина.
4. Дараах утгуудыг бөглөнө:
   | Түлхүүр | Утга |
   |---|---|
   | `DATABASE_URL` | Neon-оос хуулсан connection string |
   | `ADMIN_PASSWORD` | Админ панелийн нууц үг (өөрөө зохио, 10+ тэмдэгт) |
   | `PUBLIC_URL` | Одоохондоо хоосон орхиж болно (5-р алхамд бөглөнө) |
   | `APP_URL` | Мөн адил |
5. **Apply** дарна. Build 3–6 минут үргэлжилнэ. Logs дээр `MindEdu API → …` гэж гарвал бэлэн.
6. Дээд хэсэгт сайтын хаяг гарна, жишээ нь `https://mindedu.onrender.com` — нээгээд үзээрэй 🎉

---

## 4. Шалгах

- Сайт: `https://ТАНЫ-ХАЯГ.onrender.com`
- Админ: `https://ТАНЫ-ХАЯГ.onrender.com/admin` → нэр `admin`, нууц үг = таны оруулсан `ADMIN_PASSWORD`
- Админ → Холбоос, холбоо барих → **Нүүр хэсгийн загвар**-аас header-ийн загвараа сонгоно.

---

## 5. Хаягаа бүртгэх

Render → таны service → **Environment**:
- `PUBLIC_URL` = `https://ТАНЫ-ХАЯГ.onrender.com`
- `APP_URL` = мөн адил

**Save Changes** → сайт автоматаар дахин асна. (QPay төлбөрийн мэдэгдэл, и-мэйлийн линкүүд энэ хаягийг ашиглана.)

---

## Анхаарах зүйлс (үнэгүй хувилбар)

- **Унтдаг**: 15 минут хэн ч ороогүй бол сайт унтаж, дараагийн зочинд эхний ачаалалт 30–50 секунд болно.
  Сэрүүн байлгах бол https://uptimerobot.com (үнэгүй) дээр `https://ТАНЫ-ХАЯГ.onrender.com/api/health` хаягийг 5 минут тутам шалгахаар тохируулна.
- **Видео файл**: админаас *файлаар* хуулсан видео redeploy хийхэд устна. Видео хичээлд **YouTube (Unlisted) эсвэл Vimeo холбоос** ашиглаарай.
  (Зургууд Neon-д хадгалагддаг тул устахгүй.)
- **Бүртгэлийн код**: SMS, и-мэйл тохируулаагүй үед `SHOW_DEV_CODES=true` тул баталгаажуулах код дэлгэц дээр шууд харагдана (үзүүлэнд тохиромжтой).
  Жинхэнээр ашиглахдаа SMS (`SMS_URL`…) эсвэл SMTP (`SMTP_HOST`…) тохируулаад `SHOW_DEV_CODES`-ийг устгана. Утгуудыг `server/.env.example`-аас харна.
- **Төлбөр**: `QPAY_MODE=demo` — жинхэнэ мөнгө хөдлөхгүй. QPay гэрээ байгуулсны дараа `live` болгож `QPAY_USERNAME`, `QPAY_PASSWORD`, `QPAY_INVOICE_CODE` нэмнэ.
- **Neon үнэгүй**: 0.5 GB хүртэл — сайтын хэрэгцээнд хангалттай.

---

## Шинэчлэлт оруулах

Кодоо GitHub-д дахин оруулахад (upload эсвэл `git push`) Render **автоматаар** шинэчилнэ (2–5 минут).
Хөтчөөр оруулж байгаа бол өөрчлөгдсөн файлуудыг ижил байрлалд нь дахин чирж оруулахад хангалттай.

## Өөрийн домэйн (mindedu.mn)

Render → service → **Settings → Custom Domains → Add** → `mindedu.mn` → Render-ийн өгсөн DNS бичлэгийг домэйн бүртгэгч (Datacom г.м.) дээрээ нэмнэ. SSL үнэгүй автоматаар тохирно.
Дараа нь `PUBLIC_URL`, `APP_URL`-ийг `https://mindedu.mn` болгоно.
