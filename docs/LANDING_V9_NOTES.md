# Landing v9 — implementation notes

## Scope

This branch changes only the public conversion landing. Student, onboarding, role dashboards, Supabase schema, RLS policies, routes and business logic remain unchanged.

## Marketing-data policy

- Prices continue to come from `getPublicPlans()` / Supabase.
- No fallback prices are hard-coded.
- Student counts, average scores and teacher achievements are not invented.
- Testimonials render only after verified entries are added to `approvedTestimonials` with publication consent.
- Optional hero video is enabled through `NEXT_PUBLIC_HERO_VIDEO_URL`; the approved hero image remains the fallback and poster.

## Validation performed

- 34/34 source-level Node tests passed locally, excluding the rendered HTML test that requires an already built `dist` artifact.
- Changed TSX files passed a standalone TypeScript syntax/type-shape check with local framework stubs.
- All three v9 CSS files parsed without syntax errors.
- Full `npm ci`, lint and production build could not be completed in the execution environment because its package mirror did not contain a required dependency tarball and direct npm access timed out.

Do not treat the environment limitation as a successful production build. Run the standard CI commands in an environment with normal registry access before merging.
