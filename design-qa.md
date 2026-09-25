# Visual design QA

**Source visual truth:** `design/reference-mobile.png` (853 × 1844 px).

**Rendered implementation:** `qa-mobile-final-2026-09-25.png` (390 × 844 px browser-rendered mobile viewport, device pixel ratio 1).

**Normalized comparison:** `qa-comparison-full-2026-09-25.png`. The source was downsampled to 390 × 844 and placed beside the implementation at the same visible size. `qa-comparison-bottom-2026-09-25.png` is the focused footer/action comparison.

**State:** Local-preview mode with two real UI-submitted wishes in motion. The source uses static example messages, so exact moving-message positions and wording are intentionally not treated as fidelity defects.

## Full-view evidence

The implementation preserves the source hierarchy: calligraphic title and supporting line, luminous moon, lantern-filled sky, mountains and lake, osmanthus foreground, and a prominent vermilion action near the bottom. Real wishes occupy the lower sky without visible rails or a ticker rectangle. The browser-rendered implementation keeps the moon, title, message field and main action clear of one another.

## Focused evidence

The focused footer comparison confirms that the generated ornamental button plate, ivory text and red/gold palette match the source role and visual weight. The implementation adds two compact glass controls above the action for recent wishes and motion preference; these are intentional product controls and remain subordinate to the main action.

## Findings

- No actionable P0, P1 or P2 visual, responsive or interaction differences remain at the inspected mobile viewport.
- [P3] The system Songti fallback is cleaner and less brush-like than the source title lettering. Keeping system fonts avoids a render-blocking remote Chinese font and is acceptable for the current GitHub Pages target.
- [P3] Dynamic wishes can be partly visible at an edge while entering or leaving the viewport. This is expected motion behavior, not clipping of a static message.

## Required fidelity surfaces

- **Fonts and typography:** Chinese serif hierarchy is consistent and readable; title, CTA and moving wishes retain clear optical separation. The P3 calligraphy difference is recorded above.
- **Spacing and layout rhythm:** 390 × 844 mobile composition matches the source proportions. The CTA, supporting note and utility controls remain inside the safe footer area. Dialogs fit the viewport without hidden primary actions.
- **Colors and visual tokens:** midnight indigo, moonlit ivory, osmanthus gold, vermilion red and dark glass surfaces map closely to the source.
- **Image quality and asset fidelity:** the full-bleed source-derived background, ornamental button and transparent lantern are real raster assets. The optimized background is a visually inspected 88-quality JPEG; the original PNG assets are retained under `design/source-assets/`.
- **Copy and content:** the title, supporting line, anonymous-send promise, form guidance and recent-wish labels are coherent Chinese product copy. Local preview is explicitly disclosed.

## Comparison history

1. `audit-initial-mobile.png` and `audit-initial-desktop.png` showed the existing mobile composition and a plain dark desktop surround. The desktop surface was improved with a restrained, blurred extension of the same source artwork.
2. Initial controls used 33–35 px touch targets. Utility and close controls were increased to 42–44 px, and dialogs gained focus trapping plus focus restoration. `qa-compose-final-2026-09-25.png` confirms the revised composer.
3. Root-relative CSS assets would fail on a repository-scoped GitHub Pages URL. Asset URLs now derive from Vite's base path, and a `/moon-wishes-source/` production build was checked for stray `/images` references.
4. The 2.3 MB scene PNG and 1.5 MB lantern were replaced in the deployable bundle by inspected derivatives. The final static bundle is about 1.1 MiB; the full-resolution sources remain in the design folder.
5. The final same-size visual comparison found no remaining P0/P1/P2 issues.

## Browser verification

- Primary interactions tested: open and close composer, textarea autofocus, Escape close with focus restored to the trigger, fill message and nickname, submit, success toast, recent-wishes list, and reduced-motion toggle.
- Responsive views checked: 390 × 844 mobile and 1366 × 768 desktop.
- Browser console warnings/errors: none.
- Remote integration boundary: no new Supabase project or GitHub repository is connected, so hosted anonymous Auth, RLS, cross-device Realtime and the public Pages URL remain unverified.

final result: passed
