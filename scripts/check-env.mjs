import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const envPath = path.join(cwd, '.env');

const parseEnvFile = (raw) => {
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    out[key] = value;
  }
  return out;
};

const fileEnv = fs.existsSync(envPath) ? parseEnvFile(fs.readFileSync(envPath, 'utf8')) : {};
const env = { ...fileEnv, ...process.env };

const required = [
  {
    key: 'GEMINI_KEY',
    ok: Boolean(env.VITE_API_KEY || env.API_KEY),
    hint: 'Set VITE_API_KEY (preferred) or API_KEY',
  },
  {
    key: 'GOOGLE_CLIENT_ID',
    ok: Boolean(env.GOOGLE_CLIENT_ID),
    hint: 'Set GOOGLE_CLIENT_ID',
  },
];

const recommended = [
  {
    key: 'VITE_SUPABASE_URL',
    ok: Boolean(env.VITE_SUPABASE_URL),
    hint: 'Recommended: set VITE_SUPABASE_URL to remove fallback mode',
  },
  {
    key: 'VITE_SUPABASE_ANON_KEY',
    ok: Boolean(env.VITE_SUPABASE_ANON_KEY),
    hint: 'Recommended: set VITE_SUPABASE_ANON_KEY to remove fallback mode',
  },
];

console.log('P3 env check');
console.log('============');

let hasError = false;
for (const check of required) {
  if (check.ok) {
    console.log(`[OK] ${check.key}`);
  } else {
    hasError = true;
    console.log(`[MISSING] ${check.key} -> ${check.hint}`);
  }
}

console.log('\nRecommended env:');
for (const check of recommended) {
  if (check.ok) {
    console.log(`[OK] ${check.key}`);
  } else {
    console.log(`[WARN] ${check.key} -> ${check.hint}`);
  }
}

console.log('\nNetlify admin invite env (needed for admin invite/list users only):');
const netlifyToken = Boolean(env.NETLIFY_IDENTITY_ADMIN_TOKEN);
console.log(`${netlifyToken ? '[SET]' : '[MISSING]'} NETLIFY_IDENTITY_ADMIN_TOKEN`);
console.log(
  `${env.NETLIFY_ADMIN_ALLOWED_EMAIL_DOMAINS ? '[SET]' : '[DEFAULT]'} NETLIFY_ADMIN_ALLOWED_EMAIL_DOMAINS`,
);
console.log(`${env.NETLIFY_ADMIN_ALLOWED_EMAILS ? '[SET]' : '[EMPTY]'} NETLIFY_ADMIN_ALLOWED_EMAILS`);
console.log(`${env.NETLIFY_IDENTITY_URL ? '[SET]' : '[AUTO]'} NETLIFY_IDENTITY_URL`);

if (hasError) {
  process.exitCode = 1;
}
