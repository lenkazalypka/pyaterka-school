# Production go/no-go checklist

Deployment is **NO-GO** until every required item below is confirmed by the owner.

## Infrastructure and data

- [ ] A separate production Supabase project exists.
- [ ] All files in `supabase/migrations/` were applied in filename order.
- [ ] `supabase/seed.sql` was **not** applied to production.
- [ ] RLS integration CI is green on the deployment commit.
- [ ] `verify`/build CI is green on the deployment commit.
- [ ] Storage buckets remain private; signed URL access was smoke-tested.
- [ ] Database backups and the required PITR/retention plan were reviewed.

## Auth and configuration

- [ ] Supabase Auth Site URL is the canonical production HTTPS URL.
- [ ] Supabase Auth Redirect URLs contain only intended production callback URLs.
- [ ] Every required production variable from `.env.example` is configured in Vercel.
- [ ] `INVITATION_TOKEN_PEPPER` is unique, random, at least 32 characters, and stored only as a server-side secret.
- [ ] A real email adapter is implemented and `EMAIL_PROVIDER` selects it; `console` is not used in production.
- [ ] Public signup is covered by reviewed Supabase Auth rate limits and an edge/WAF rate limit before a public campaign. Add CAPTCHA only if the observed abuse level requires it.
- [ ] The custom domain resolves correctly and HTTPS/certificate renewal were checked.

## Product and operations

- [ ] Smoke tests passed as student, confirmed parent, teacher, assigned curator, and admin; unrelated-role access was also denied.
- [ ] Error monitoring and alert ownership are configured for server errors, auth failures, and invitation delivery failures.
- [ ] Privacy policy, personal-data consent, public offer, and other required legal text were approved; current drafts are not treated as approval.
- [ ] The safe baseline headers are present in production. A full script/style CSP requires a separate nonce-based implementation and report-only rollout.

## Explicit scope warning

Real payment processing is not implemented. Subscriptions created by onboarding remain `pending`/manual; production must not claim or accept automated online payments until a real payment flow, reconciliation, webhooks, and refund handling are implemented and reviewed.
