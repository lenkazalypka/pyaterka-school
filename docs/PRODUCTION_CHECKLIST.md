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
- [ ] `SUPABASE_SERVICE_ROLE_KEY` and provider secrets are server-only and have no `NEXT_PUBLIC_` prefix.
- [ ] `INVITATION_TOKEN_PEPPER` is unique, random, at least 32 characters, and stored only as a server-side secret.
- [ ] A real email adapter is implemented and `EMAIL_PROVIDER` selects it; `console` is not used in production.
- [ ] Database-backed application rate limits and Supabase Auth platform limits were smoke-tested; add an edge/WAF rule before a large public campaign.
- [ ] The custom domain resolves correctly and HTTPS/certificate renewal were checked.

## Product and operations

- [ ] Smoke tests passed as student, confirmed parent, teacher, assigned curator, and admin; unrelated-role access was also denied.
- [ ] Error monitoring and alert ownership are configured for server errors, auth failures, and invitation delivery failures.
- [ ] YooKassa credentials, fiscal VAT code and HTTPS webhook for `payment.succeeded`/`payment.canceled` were configured and test-mode payment passed end to end.
- [ ] Privacy policy, personal-data consent, public offer, and other required legal text were approved; current drafts are not treated as approval.
- [ ] The safe baseline headers are present in production. A full script/style CSP requires a separate nonce-based implementation and report-only rollout.

## Explicit scope warning

Checkout and activation webhooks are implemented. Refunds, recurring charges and reconciliation reports remain outside this stage and must not be advertised as available.
