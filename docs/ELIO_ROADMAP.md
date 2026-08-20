# Roadmap ELIO

## 0. Foundation stabilization

- зелёный Node и PostgreSQL RLS CI;
- role-aware auth destination;
- curator read/write boundary;
- generated Supabase types;
- authenticated mobile smoke tests.

## 1. Learning continuity

- course-centric lesson catalog;
- lesson start/resume events;
- homework start and submission lifecycle;
- diagnostic roadmap на student surface;
- grading и attendance для teacher.

## 2. AI mentor

- read-only mentor с server context;
- streaming, history, rate/cost limits;
- source-aware explanations и evals;
- explicit consent/retention controls.

## 3. Family and staff

- parent period view, attendance context и recommendations;
- curator caseload и intervention flow без academic authoring;
- admin CRUD для users/groups/subscriptions с audit log.

## 4. Production readiness

- test-mode ЮKassa end-to-end и reconciliation decision;
- Resend/Auth deliverability;
- private storage upload/revoke smoke tests;
- legal approval, backups/PITR, monitoring ownership;
- accessibility и visual regression baseline.

Каждый этап выпускается вертикальными срезами и не рекламируется до появления реального Supabase-backed сценария.
