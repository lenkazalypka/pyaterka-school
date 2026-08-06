# Optional Sites / Cloudflare tests

These tests validate the optional OpenAI Sites / Cloudflare Worker artifact in
`dist/server/index.js`. They are intentionally excluded from the standard
Vercel/Next.js test path.

Run them with:

```bash
npm run test:sites
```

The test path is relative to this nested directory and therefore uses
`../../dist/server/index.js`.
