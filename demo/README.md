# Original landing page with local SQLite

The standalone entry point renders the repository's existing LandingPage and LegalModal components. It builds without loading the full application or its Supabase configuration.

```sh
npx vite build --config landing.vite.config.ts
cp public/logo.svg dist-landing/
P3_DEMO_DB=/absolute/path/to/p3-landing.sqlite PORT=5173 node demo/server.mjs
```

Use Node.js 22.13 or later. The database starts with an empty waitlist. A browser receipt protects an individual's position and referral code. Check status from the browser used to join. Set `P3_PUBLIC_ORIGIN` if serving on another origin. Protect and back up the database outside the public build directory. The standalone server binds to loopback for Cloudflare Tunnel.
