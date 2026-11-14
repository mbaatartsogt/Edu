-- MindEdu өгөгдлийн сангийн бүтэц. Сервер асахад автоматаар ажиллана (давтан ажиллуулахад аюулгүй).

CREATE TABLE IF NOT EXISTS enrollments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_name  TEXT        NOT NULL CHECK (char_length(child_name) BETWEEN 2 AND 60),
  age         SMALLINT    NOT NULL CHECK (age BETWEEN 8 AND 18),
  phone       VARCHAR(8)  NOT NULL CHECK (phone ~ '^[0-9]{8}$'),
  schedule    TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'new'
              CHECK (status IN ('new', 'contacted', 'tested', 'enrolled', 'cancelled')),
  note        TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS enrollments_created_at_idx ON enrollments (created_at DESC);
CREATE INDEX IF NOT EXISTS enrollments_status_idx ON enrollments (status);

-- ===== Сайтын контент (админ панелаас засна) =====

-- Сошиал холбоос, утас, хаяг зэрэг ерөнхий тохиргоо
CREATE TABLE IF NOT EXISTS settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL DEFAULT ''
);

-- Админаас оруулсан зургууд (redeploy хийхэд устахгүйн тулд DB-д хадгална)
CREATE TABLE IF NOT EXISTS images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mime        TEXT        NOT NULL,
  data        BYTEA       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS programs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  age         TEXT    NOT NULL,
  title       TEXT    NOT NULL,
  level       TEXT    NOT NULL DEFAULT '',
  goals       TEXT[]  NOT NULL DEFAULT '{}',
  days        TEXT    NOT NULL DEFAULT '',
  class_time  TEXT    NOT NULL DEFAULT '',
  theme       TEXT    NOT NULL DEFAULT 'sky',
  visible     BOOLEAN NOT NULL DEFAULT true,
  sort_order  INT     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teachers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT    NOT NULL,
  role        TEXT    NOT NULL DEFAULT '',
  bio         TEXT    NOT NULL DEFAULT '',
  badges      TEXT[]  NOT NULL DEFAULT '{}',
  photo       TEXT    NOT NULL DEFAULT '',
  visible     BOOLEAN NOT NULL DEFAULT true,
  sort_order  INT     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS branches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT    NOT NULL,
  region      TEXT    NOT NULL DEFAULT '',
  address     TEXT    NOT NULL DEFAULT '',
  phone       TEXT    NOT NULL DEFAULT '',
  hours       TEXT    NOT NULL DEFAULT '',
  map_url     TEXT    NOT NULL DEFAULT '',
  theme       TEXT    NOT NULL DEFAULT 'blue',
  bg_image    TEXT    NOT NULL DEFAULT '',
  kids_image  TEXT    NOT NULL DEFAULT '',
  visible     BOOLEAN NOT NULL DEFAULT true,
  sort_order  INT     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== Чат-бот =====

-- Автомат хариулагчийн асуулт, хариултууд
CREATE TABLE IF NOT EXISTS faqs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question      TEXT    NOT NULL,
  keywords      TEXT[]  NOT NULL DEFAULT '{}',
  answer        TEXT    NOT NULL,
  collect_lead  BOOLEAN NOT NULL DEFAULT false,
  visible       BOOLEAN NOT NULL DEFAULT true,
  sort_order    INT     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Чатаар үлдээсэн холбоо барих мэдээлэл
CREATE TABLE IF NOT EXISTS chat_leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  phone       VARCHAR(8)  NOT NULL CHECK (phone ~ '^[0-9]{8}$'),
  age         SMALLINT,
  topic       TEXT        NOT NULL DEFAULT 'question',
  message     TEXT        NOT NULL DEFAULT '',
  transcript  JSONB       NOT NULL DEFAULT '[]',
  status      TEXT        NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'done')),
  note        TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_leads_created_at_idx ON chat_leads (created_at DESC);

-- ===== Хэрэглэгч (эцэг эх), захиалга, төлбөр =====

ALTER TABLE programs ADD COLUMN IF NOT EXISTS price INT NOT NULL DEFAULT 0;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS price_label TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT        NOT NULL,
  phone          VARCHAR(8)  NOT NULL UNIQUE CHECK (phone ~ '^[0-9]{8}$'),
  email          TEXT        NOT NULL DEFAULT '',
  password_hash  TEXT        NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS order_no_seq START 1001;

CREATE TABLE IF NOT EXISTS orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no         TEXT        NOT NULL UNIQUE DEFAULT ('MD' || nextval('order_no_seq')),
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id       UUID        REFERENCES programs(id) ON DELETE SET NULL,
  program_title    TEXT        NOT NULL,
  program_age      TEXT        NOT NULL DEFAULT '',
  branch_id        UUID        REFERENCES branches(id) ON DELETE SET NULL,
  branch_name      TEXT        NOT NULL DEFAULT '',
  child_name       TEXT        NOT NULL,
  child_age        SMALLINT    NOT NULL,
  amount           INT         NOT NULL CHECK (amount > 0),
  status           TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  payment_method   TEXT        NOT NULL DEFAULT 'qpay',
  qpay_invoice_id  TEXT,
  qpay_data        JSONB,
  paid_at          TIMESTAMPTZ,
  note             TEXT        NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);

-- ===== И-мэйл баталгаажуулалт, нууц үг сэргээх =====
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
-- Өмнө нь зөвхөн утсаар бүртгүүлсэн хэрэглэгчдийг баталгаажсан гэж үзнэ
UPDATE users SET email_verified_at = created_at WHERE email = '' AND email_verified_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_uq ON users (lower(email)) WHERE email <> '';

CREATE TABLE IF NOT EXISTS user_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT        NOT NULL CHECK (kind IN ('verify', 'reset')),
  token_hash  TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== MindPoint =====
CREATE TABLE IF NOT EXISTS rewards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT    NOT NULL,
  description  TEXT    NOT NULL DEFAULT '',
  image        TEXT    NOT NULL DEFAULT '',
  points_cost  INT     NOT NULL DEFAULT 0 CHECK (points_cost >= 0),
  stock        INT     CHECK (stock IS NULL OR stock >= 0),
  visible      BOOLEAN NOT NULL DEFAULT true,
  sort_order   INT     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Онооны бүртгэл (нэмэх +, хасах −). Үлдэгдэл = нийлбэр
CREATE TABLE IF NOT EXISTS point_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      INT         NOT NULL,
  kind        TEXT        NOT NULL,
  reason      TEXT        NOT NULL DEFAULT '',
  ref_id      UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS point_tx_user_idx ON point_transactions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS redemptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT        NOT NULL UNIQUE,
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_id     UUID        REFERENCES rewards(id) ON DELETE SET NULL,
  reward_title  TEXT        NOT NULL,
  reward_image  TEXT        NOT NULL DEFAULT '',
  points        INT         NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
  note          TEXT        NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS redemptions_user_idx ON redemptions (user_id, created_at DESC);

-- ===== Нэг захиалгад олон хөтөлбөр (сагс) =====
CREATE TABLE IF NOT EXISTS order_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  position       SMALLINT    NOT NULL DEFAULT 0,
  program_id     UUID        REFERENCES programs(id) ON DELETE SET NULL,
  program_title  TEXT        NOT NULL,
  program_age    TEXT        NOT NULL DEFAULT '',
  branch_id      UUID        REFERENCES branches(id) ON DELETE SET NULL,
  branch_name    TEXT        NOT NULL DEFAULT '',
  child_name     TEXT        NOT NULL,
  child_age      SMALLINT    NOT NULL,
  amount         INT         NOT NULL CHECK (amount > 0)
);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id, position);

-- Өмнөх нэг хөтөлбөртэй захиалгуудыг order_items руу хуулна (нэг удаа)
INSERT INTO order_items (order_id, position, program_id, program_title, program_age, branch_id, branch_name, child_name, child_age, amount)
SELECT o.id, 0, o.program_id, o.program_title, o.program_age, o.branch_id, o.branch_name, o.child_name, o.child_age, o.amount
FROM orders o WHERE NOT EXISTS (SELECT 1 FROM order_items i WHERE i.order_id = o.id);

-- ===== Утасны дугаараар бүртгүүлэх (SMS OTP) =====
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;   -- и-мэйлээр бүртгүүлсэн хүнд утас заавал биш
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS otp_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone       VARCHAR(8)  NOT NULL,
  purpose     TEXT        NOT NULL CHECK (purpose IN ('verify', 'reset')),
  code_hash   TEXT        NOT NULL,
  attempts    SMALLINT    NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS otp_codes_phone_idx ON otp_codes (phone, purpose, created_at DESC);

-- ===== Хөтөлбөрийн төлбөрийн давтамж, ангийн багтаамж =====
ALTER TABLE programs ADD COLUMN IF NOT EXISTS billing_days INT NOT NULL DEFAULT 30;  -- 0 = нэг удаагийн төлбөр
ALTER TABLE programs ADD COLUMN IF NOT EXISTS capacity INT;                         -- NULL = хязгааргүй

-- ===== Видео хичээл (төлбөр төлсөн эцэг эхчүүд үзнэ) =====
-- Админаас оруулсан видео файлууд. Файл нь дискэнд (VIDEO_DIR), мэдээлэл нь энд.
CREATE TABLE IF NOT EXISTS videos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_name  TEXT        NOT NULL DEFAULT '',
  mime           TEXT        NOT NULL,
  size           BIGINT      NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lessons (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id   UUID    REFERENCES programs(id) ON DELETE SET NULL,
  module       TEXT    NOT NULL DEFAULT '',     -- бүлэг: "Unit 1 · Greetings"
  title        TEXT    NOT NULL,
  description  TEXT    NOT NULL DEFAULT '',
  video        TEXT    NOT NULL DEFAULT '',     -- YouTube/Vimeo/... холбоос эсвэл /api/videos/<id>
  duration     TEXT    NOT NULL DEFAULT '',
  thumbnail    TEXT    NOT NULL DEFAULT '',
  is_free      BOOLEAN NOT NULL DEFAULT false,  -- төлбөргүй үзүүлэх (танилцуулга)
  visible      BOOLEAN NOT NULL DEFAULT true,
  sort_order   INT     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lessons_program_idx ON lessons (program_id, sort_order);

-- Хэрэглэгч бүрийн үзсэн байдал
CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id     UUID        NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  position_sec  INT         NOT NULL DEFAULT 0,
  completed_at  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);

-- ===== Сайтын хандалтын статистик =====
-- IP хаяг хадгалахгүй. visitor_id = хөтөч дээр үүсгэсэн санамсаргүй ID
CREATE TABLE IF NOT EXISTS page_views (
  id          BIGSERIAL PRIMARY KEY,
  visitor_id  VARCHAR(40) NOT NULL,
  user_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
  path        TEXT        NOT NULL,
  referrer    TEXT        NOT NULL DEFAULT '',
  device      TEXT        NOT NULL DEFAULT 'desktop',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS page_views_created_idx ON page_views (created_at);
