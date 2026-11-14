// server/.env файлыг ачаална (байхгүй бол алгасна). Бусад import-оос өмнө ажиллах ёстой.
import { fileURLToPath } from 'node:url';
try { process.loadEnvFile(fileURLToPath(new URL('.env', import.meta.url))); } catch { /* .env байхгүй — орчны хувьсагч ашиглана */ }
