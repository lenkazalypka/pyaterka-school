# Production go/no-go checklist

Deployment is **NO-GO** until every required item below is confirmed by the owner.

## Infrastructure and data

- [ ] A separate production Supabase project exists.
- [ ] All files in `supabase/migrations/` were applied in filename order.
- [ ] `supabase/seed.sql` was **not** applied to production.
- [ ] RLS integration CI is green on the deployment commit.
- [ ] `verify`/build CI is green on the deployment commit.
- [ ] Production dependency audit has no unresolved high or critical advisory; the current `fast-uri` advisory is a release blocker until reviewed and resolved.
- [ ] Storage buckets remain private; signed URL access was smoke-tested.
- [ ] Database backups and the required PITR/retention plan were reviewed.

## Auth and configuration

- [ ] Supabase Auth Site URL is the canonical production HTTPS URL.
- [ ] Supabase Auth Redirect URLs contain only intended production callback URLs.
- [ ] Every required production variable from `.env.example` is configured in Vercel.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` and provider secrets are server-only and have no `NEXT_PUBLIC_` prefix.
- [ ] `INVITATION_TOKEN_PEPPER` is unique, random, at least 32 characters, and stored only as a server-side secret.
- [ ] If AI mentor is enabled, `OPENAI_API_KEY`, `OPENAI_MODEL`, and a separate random `AI_SAFETY_PEPPER` are server-only; provider/data-processing terms are approved.
- [ ] A real email adapter is implemented and `EMAIL_PROVIDER` selects it; `console` is not used in production.
- [ ] Database-backed application rate limits and Supabase Auth platform limits were smoke-tested; add an edge/WAF rule before a large public campaign.
- [ ] The custom domain resolves correctly and HTTPS/certificate renewal were checked.

## Product and operations

- [ ] Public, auth, transactional email and payment-description surfaces use the approved elio brand; preserved legacy database/seed identifiers are not shown as current brand copy.
- [ ] Student schedule and notification times were smoke-tested in at least two supported time zones, including a date boundary.
- [ ] Smoke tests passed as student, confirmed parent, teacher, assigned curator, and admin; unrelated-role access was also denied.
- [ ] Authenticated student dashboard and lesson detail passed visual/mobile inspection against production-like data; the local offline/login checks are not a substitute.
- [ ] Error monitoring and alert ownership are configured for server errors, auth failures, and invitation delivery failures.
- [ ] Before enabling AI mentor, output moderation/incident handling, privacy and pedagogical evals, token/cost telemetry, hard budget alerts, scheduled purge of expired conversations, retention/delete behavior, and production RLS CI were approved.
- [ ] YooKassa credentials, fiscal VAT code and HTTPS webhook for `payment.succeeded`/`payment.canceled` were configured and test-mode payment passed end to end.
- [ ] Privacy policy, personal-data consent, public offer, and other required legal text were approved; current drafts are not treated as approval.
- [ ] `LEAD_CAPTURE_ENABLED=true` is set only after the lead consent, operator details, retention and deletion process are legally approved.
- [ ] Migration `202608210008_commercial_pricing.sql` is applied; all 12 active price rows and four duration discounts were approved by the commercial owner.
- [ ] Pricing-to-subscription handoff and displayed totals were reconciled with ЮKassa before enabling paid acquisition.
- [ ] A real lead was verified in `leads` with the matching `user_plan_selection` price snapshot.
- [ ] The safe baseline headers are present in production. A full script/style CSP requires a separate nonce-based implementation and report-only rollout.

## Explicit scope warning

Checkout and activation webhooks are implemented. Refunds, recurring charges and reconciliation reports remain outside this stage and must not be advertised as available.
