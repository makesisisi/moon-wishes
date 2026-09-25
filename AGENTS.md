# Prototype Instructions

## Current product decisions

- User prefers a mobile-first GitHub Pages WEBSITE, not a mobile app shell.
- Selected visual direction: illuminated Chinese landscape with osmanthus flowers, floating lanterns and a bright moon. Revision without visible rails is preserved at `design/reference-mobile.png`.
- Blessings arrive unpredictably. Never hand-place sample text around the moon; show real messages in the lower sky, schedule them on invisible collision-avoidance slots and keep title, moon and send button clear. No visible rails or rectangular ticker area.
- Motion should feel calm and organic rather than like a mechanical marquee: stagger blessing arrivals, layer slow horizontal travel with subtle vertical drift, and let a sent lantern sway along a curved, fading path. Animation toggles and repeated sends must restart cleanly without stale timers.
- The main scene should feel quietly alive: use layered, low-distraction background motion (slow image drift, breathing moonlight, mist, sparse glints and osmanthus petals). Opening “写下祝福” should have soft press feedback, a spring-like sheet transition and gently staggered content rather than a rigid linear slide.
- Background motion must be clearly visible without moving the whole composition aggressively. Opening “写下祝福” must not focus a text field, resize the mobile viewport, or overshoot upward before settling; keep the backdrop visually anchored until the visitor explicitly taps an input.
- The supplied 《三相奇谈》 game OST is the selected BGM. Water, the small lanterns and the moon should each have clearly visible but calm local motion. The dimmed upper backdrop must end exactly at the top edge of the blessing sheet, including around its rounded corners.
- Keep the ambient effects unmistakably visible: moonlight, water ripples, lantern glow, star glints and falling osmanthus should read at a glance while the overall scene remains calm.
- BGM is enabled by default. Attempt autoplay immediately, then start it on the visitor's first interaction when browser autoplay policy blocks sound; the music control must still allow an explicit opt-out.
- On every page opening, show a small, refined invitation envelope over the still-visible moonlit scene. Require one light “启封” interaction, then transition naturally into the main page so the interaction requirement feels intentional rather than intrusive.
- Every approved or locally sent blessing stays in the playback catalog. New blessings take priority, then the historical catalog loops continuously instead of disappearing after one pass.
- No cross-device account history: anonymous Supabase sign-in on first send. Viewing is public.
- The user wants GitHub Pages and Supabase, with striking but readable festival interaction.
- On mobile, the blessing-history sheet should use most of the viewport height, keep its heading compact and give the card list an independent scroll area instead of compressing the messages.
- Keep lightweight, no-text participation behind one compact “月下相聚” entry. Its first two rituals are “送出一块月饼” and “一起赏一会月”; each anonymous visitor may join each ritual once, and only aggregate counts are public.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.
