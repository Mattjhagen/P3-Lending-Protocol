# SQLite landing page

Run with Node.js 22.13 or newer. The application creates an independent SQLite database with fictional marketplace examples. It listens on loopback for a Cloudflare Tunnel connector.

```sh
P3_DEMO_DB=/absolute/path/to/preview.sqlite PORT=5173 node demo/server.mjs
```

Check the homepage and `/health`. Accounts, lending requests and payments are outside this preview. The existing application source and its schema are maintained separately.
