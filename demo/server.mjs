import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';

const database = new DatabaseSync(process.env.P3_DEMO_DB ?? 'p3-demo.sqlite');
database.exec(`
  CREATE TABLE IF NOT EXISTS example_listings (
    id INTEGER PRIMARY KEY, purpose TEXT NOT NULL, amount INTEGER NOT NULL, months INTEGER NOT NULL
  ) STRICT;
  INSERT OR IGNORE INTO example_listings VALUES
    (1, 'Equipment for a bakery', 2400, 12),
    (2, 'Inventory for a bookshop', 1500, 9),
    (3, 'Tools for a repair business', 3200, 18);
`);
const examples = database.prepare('SELECT purpose, amount, months FROM example_listings ORDER BY id');
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const escape = (value) => value.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

function render() {
  const cards = examples.all().map(({ purpose, amount, months }) =>
    `<li><strong>${escape(purpose)}</strong><p>${currency.format(amount)} · ${months} months</p></li>`
  ).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Explore the P³ Lending Protocol peer-to-peer marketplace concept.">
<title>P³ Lending Protocol — Marketplace Preview</title>
<style>
:root{color-scheme:dark;background:#0d1110;color:#f2f7f4;font:1rem/1.6 system-ui,sans-serif}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 80% 0%,#193e2a,transparent 65%)}
main{margin:auto;max-width:1040px;padding:clamp(38px,9vw,110px) 24px}
h1{font-size:clamp(2.65rem,8vw,6rem);line-height:1;letter-spacing:-.065em;margin:.23em 0}
p{color:#c0cdc5;max-width:63ch}a,.label{color:#a0edbd}.label{font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-size:.83rem}
a:focus-visible{outline:2px solid;outline-offset:4px}section{margin-top:44px}
ul{padding:0;list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,235px),1fr));gap:12px}
li{padding:20px;background:#15201a;border:1px solid #3a5244;border-radius:10px}li p{margin:.3rem 0 0}
</style></head><body><main>
<p class="label">Project preview</p><h1>P³ Lending Protocol</h1>
<p>A peer-to-peer lending marketplace concept exploring how reputation and social underwriting can inform access to credit.</p>
<p><a href="https://github.com/Mattjhagen/P3-Lending-Protocol">Explore the source code ↗</a></p>
<section aria-labelledby="examples"><h2 id="examples">Example listings</h2>
<p>Fictional examples illustrate the concept. Applications, accounts, and payments are unavailable in this preview.</p>
<ul>${cards}</ul></section></main></body></html>`;
}

createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  const path = new URL(request.url, 'http://localhost').pathname;
  if (path === '/health') {
    database.prepare('SELECT 1').get();
    response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end('ok');
  } else if (path === '/') {
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'",
    }).end(render());
  } else {
    response.writeHead(404).end();
  }
}).listen(Number(process.env.PORT ?? 5173), '127.0.0.1');
