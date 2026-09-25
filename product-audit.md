# Product audit

## Audit scope

Mobile-first Mid-Autumn wish flow: arrive, compose, send, see the celebration feedback, review recent wishes, and reduce motion. Desktop framing and keyboard behavior were also checked.

## User goal and accessibility target

A visitor should understand the festival interaction immediately, send one short blessing without a registration form, and see it join the shared night sky. The core flow should remain usable with keyboard navigation, reduced motion and a narrow phone viewport.

## Step health

1. **Arrival — healthy.** `qa-mobile-final-2026-09-25.png` shows a clear title, scene, one dominant action, recent-wish access and an honest local-preview status.
2. **Open composer — healthy.** `qa-compose-final-2026-09-25.png` keeps the moonlit art direction while presenting labelled fields, a character counter, clear public-visibility guidance and a disabled empty submit state.
3. **Send a wish — healthy locally; remote path unverified.** A UI-submitted wish produced a success status, lantern animation and a queued moving message. Supabase Auth/RLS/Realtime still require a new or selected project.
4. **Review recent wishes — healthy.** `qa-list-final-2026-09-25.png` shows newest-first messages with nickname and Shanghai time in a scrollable sheet.
5. **Reduce motion — healthy.** The animated queue clears, the newest wish becomes a static readable card, and the control changes to “开启动画”.
6. **Desktop presentation — healthy.** `qa-desktop-final-2026-09-25.png` keeps the intentional mobile-width experience and uses a dark blurred extension of the same artwork instead of empty side gutters.

## Strengths

- The product promise is understood before any explanation: write a blessing and send it into the moonlit scene.
- Anonymous sign-in happens only on the first live send, so the user avoids an account wall while database ownership and rate limiting remain possible.
- The blessing list prevents messages missed in motion from becoming inaccessible.
- Local preview is clearly named and cannot be mistaken for shared data.

## UX and accessibility risks addressed

- Repository-scoped GitHub Pages paths no longer break the primary imagery.
- Utility and close targets were enlarged; dialogs now trap keyboard focus and restore it to the launching control.
- Connection, reconnecting and local-preview states have user-facing copy.
- System reduced-motion preferences and the in-page motion control both have a non-animated content path.
- Production deployment now fails when Supabase variables are missing instead of silently publishing a device-only version.

## Evidence limits

- Screenshots do not prove full WCAG compliance, screen-reader wording, network latency or behavior under zoom beyond the tested viewport.
- The connected Supabase account only exposes an unrelated inactive project, and the GitHub connection returned no usable repository. No remote schema was changed and no public deployment was attempted.

## Recommendations

The implementation is ready for integration. Create or select a dedicated Supabase project, enable anonymous sign-ins, run `supabase/schema.sql`, add the publishable URL/key as GitHub Actions variables, and then verify two-browser Realtime delivery before public promotion.
