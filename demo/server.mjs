import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const database = new DatabaseSync(process.env.P3_DEMO_DB ?? 'p3-landing.sqlite');
const assets = resolve(process.env.P3_LANDING_ASSETS ?? 'dist-landing');
database.exec(`
  PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS landing_waitlist (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    receipt_hash TEXT NOT NULL UNIQUE,
    referral_code TEXT NOT NULL UNIQUE,
    referrer INTEGER REFERENCES landing_waitlist(id)
  ) STRICT;
  CREATE INDEX IF NOT EXISTS landing_waitlist_referrer ON landing_waitlist(referrer);
`);
const count = database.prepare('SELECT COUNT(*) AS count FROM landing_waitlist');
const findEmail = database.prepare('SELECT * FROM landing_waitlist WHERE email = ?');
const findReferral = database.prepare('SELECT id FROM landing_waitlist WHERE referral_code = ?');
const insert = database.prepare(`
  INSERT INTO landing_waitlist (name, email, receipt_hash, referral_code, referrer)
  VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO NOTHING
`);
const rank = database.prepare(`
  WITH scores AS (
    SELECT w.id, COUNT(r.id) AS referrals
    FROM landing_waitlist w LEFT JOIN landing_waitlist r ON r.referrer = w.id
    GROUP BY w.id
  ), queue AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY referrals DESC, id) AS position FROM scores
  )
  SELECT position FROM queue WHERE id = ?
`);
const hash = (value) => createHash('sha256').update(value).digest('hex');
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const publicOrigin = process.env.P3_PUBLIC_ORIGIN ?? 'https://p3lending.space';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

function json(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
    .end(JSON.stringify(data));
}

async function waitlist(request, response, action) {
  if (action === 'count' && request.method === 'GET') {
    return json(response, 200, count.get());
  }
  if (request.method !== 'POST' || !['position', 'join'].includes(action)) {
    return json(response, 405, { error: 'Method unavailable' });
  }
  if (request.headers.origin !== publicOrigin || !request.headers['content-type']?.startsWith('application/json')) {
    return json(response, 403, { error: 'Request denied' });
  }
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 4096) return json(response, 413, { error: 'Request too large' });
  }
  let input;
  try { input = JSON.parse(body); } catch { return json(response, 400, { error: 'Invalid request' }); }
  const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (email.length > 254 || !emailPattern.test(email)) return json(response, 400, { error: 'Invalid email' });
  let receipt = request.headers.cookie?.match(/(?:^|;\s*)p3_waitlist=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (action === 'join') {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!name || name.length > 100) return json(response, 400, { error: 'Invalid name' });
    const referrer = typeof input.referralCode === 'string' && input.referralCode.length <= 24
      ? findReferral.get(input.referralCode.toUpperCase())?.id ?? null : null;
    const secret = randomBytes(32).toString('hex');
    const code = randomBytes(9).toString('hex').toUpperCase();
    if (insert.run(name, email, hash(secret), code, referrer).changes) {
      receipt = secret;
      response.setHeader('Set-Cookie', `p3_waitlist=${secret}; Path=/api/landing/waitlist/; Max-Age=15552000; Secure; HttpOnly; SameSite=Strict`);
    }
  }
  const row = receipt && findEmail.get(email);
  if (!row || row.receipt_hash !== hash(receipt)) return json(response, 404, { error: 'Waitlist receipt unavailable' });
  return json(response, 200, { name: row.name, position: rank.get(row.id).position, referralCode: row.referral_code });
}

createServer(async (request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', 'no-store');
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname.startsWith('/api/landing/waitlist/')) {
      await waitlist(request, response, pathname.split('/').at(-1));
      return;
    }
    if (!['GET', 'HEAD'].includes(request.method)) return response.writeHead(405).end();
    if (pathname === '/health') {
      database.prepare('SELECT 1').get();
      return response.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok');
    }
    const filename = pathname === '/' ? 'landing.html' : pathname.slice(1);
    if (filename !== 'landing.html' && filename !== 'logo.svg' && !/^assets\/[\w.-]+\.(js|css)$/.test(filename)) {
      return response.writeHead(404).end();
    }
    const content = await readFile(resolve(assets, filename));
    response.writeHead(200, { 'Content-Type': types[extname(filename)] }).end(content);
  } catch (error) {
    if (!response.headersSent) response.writeHead(error.code === 'ENOENT' ? 404 : 500).end();
    else response.end();
  }
}).listen(Number(process.env.PORT ?? 5173), '127.0.0.1');
