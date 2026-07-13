## Summary

<!-- What does this PR change, and why? -->

## Related Issue

<!-- Link any related issue, e.g. Closes #123 -->

## Type of Change

- [ ] Bug fix
- [ ] New feature (e.g. new trivia category)
- [ ] Breaking change (API contract or schema change)
- [ ] Documentation update
- [ ] Refactor / internal cleanup

## Checklist

- [ ] `pnpm run typecheck` passes
- [ ] `pnpm run build` passes
- [ ] If `lib/api-spec/openapi.yaml` changed, ran `pnpm --filter @repo/api-spec run codegen` and committed the generated output
- [ ] If `lib/db` schema changed, ran `pnpm --filter @repo/db run push` (dev) and documented the change
- [ ] New/changed trivia categories degrade to `null` for missing data rather than throwing, and are excluded from difficulty tiers with insufficient data
- [ ] Verified in the running app (preview or screenshot), not just by reading the code
- [ ] Updated `README.md` / `CHANGELOG.md` if user-facing behavior changed

## Screenshots (if UI change)

<!-- Before/after screenshots, if applicable -->

## Notes for Reviewers

<!-- Anything reviewers should pay special attention to -->
