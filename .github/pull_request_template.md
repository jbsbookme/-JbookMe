# PR Checklist (JBookMe)

## Summary
- What changed?
- Why?
- Screens / video (if UI change):

## Safety / Scope
- [ ] Change is scoped (no unrelated edits)
- [ ] No secrets / credentials added

## Database / Prisma
- [ ] No schema changes
- [ ] OR: Schema changed and migration is included in `prisma/migrations/`
- [ ] Verified production deploy will run migrations (`prisma migrate deploy`)

## Testing
- [ ] Tested locally (relevant pages/flows)
- [ ] Checked console/network errors

## Deployment rule (IMPORTANT)
- [ ] This PR will be merged into `main` before validating PWA/Production
- [ ] After merge, wait for Vercel **Production / Current Deploy** to finish
- [ ] Verify in production using `/api/version`

## Post-merge validation (Production)
- [ ] Open the app in production
- [ ] Validate the exact user flow impacted by this PR
