# Production checklist

Use this as a go/no-go gate before admitting real students.

## Infrastructure

- [ ] Production Supabase project exists.
- [ ] Apply only `supabase/migrations`; do **not** apply `supabase/seed.sql`.
- [ ] Supabase Auth Site URL and Redirect URLs point to the production domain.
- [ ] Vercel production environment contains every variable documented in `.env.example`.
- [ ] `INVITATION_TOKEN_PEPPER` is a unique random server-only value of at least 32 characters.
- [ ] Custom domain and HTTPS are working.
- [ ] Supabase backup/PITR settings and restore procedure have been reviewed.

## Security

- [ ] Application CI is green: install, typecheck, lint, tests and production build.
- [ ] PostgreSQL RLS integration suite is green for student, parent, teacher, curator and admin scenarios.
- [ ] Private Storage buckets remain private and signed URL routes are verified.
- [ ] Service-role credentials are never exposed to browser code or `NEXT_PUBLIC_*` variables.
- [ ] Production email provider is configured; `EMAIL_PROVIDER=console` is not used in production.
- [ ] Public registration abuse protection/rate limiting is configured at the platform or application layer.
- [ ] Production error monitoring/alerting is configured.

## Product smoke tests

- [ ] New student: register -> email confirmation -> onboarding -> dashboard.
- [ ] Student: schedule -> lesson -> recording -> material access.
- [ ] Confirmed parent can see only linked student data.
- [ ] Teacher can see only assigned groups/students.
- [ ] Curator can see only assigned students and their allowed academic subscription subjects.
- [ ] Admin flow works without granting admin privileges to ordinary users.
- [ ] Expired/invalid sessions redirect safely and refresh works after token expiry.

## Legal and commercial

- [ ] Privacy policy, consent text and offer/terms are approved for production use.
- [ ] Public prices and product claims are approved and match the actual offer.
- [ ] Real payment processing is **not implemented yet**; do not present pending/manual subscriptions as completed online payment.

## Go / no-go

Production launch is a **NO-GO** while any RLS integration test fails, production email is unconfigured for invitation-dependent flows, or legal documents are still drafts.
