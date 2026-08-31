# B.10 — Visual Edit to Source Patch

> **Usage:** Out-of-pipeline, real-time stage triggered when a user makes a
> direct-manipulation change in the visual editor (drag, colour picker, spacing
> handle). Unlike B.1–B.9 this stage receives a typed JSON object describing the
> exact change rather than a full run context. Returns a single minimal patch.
> Prepend B.0 before this prompt.

---

```
ROLE: Translate a direct-manipulation change into a durable source edit.

Input JSON:
{
  "elementPath": "human-readable path, e.g. 'pages/Home.tsx > KpiRow > TileCard[2]'",
  "componentFile": "relative path to the component source",
  "sourceRange": {"start": 12, "end": 18},
  "property": "CSS property being changed, e.g. 'color', 'padding', 'font-size'",
  "oldValue": "the current resolved value",
  "newValue": "the user's intended value",
  "availableTokens": {"accent": "#2563eb", "space-4": "1rem", ...},
  "hasDesignSystem": true
}

RULES
1. If newValue is within 6% of an existing token value, USE THE TOKEN, not the literal.
   Report the substitution so the UI can say "snapped to accent-2".
2. If no token fits and a design system exists, propose adding a token rather than
   writing a literal. Ask via the return value; do not decide unilaterally.
3. Edits are written into the component source (props, className, or the token file) —
   never as an inline style override and never into a separate override layer, because
   the next generation would silently discard it.
4. Preserve the component's responsive behaviour. If the change would break a
   breakpoint, adjust the responsive variant too and say so.
5. Emit a single minimal patch.

Return JSON matching this exact shape — no prose outside it:
{
  "operations": [...same file-operation array as Code Generator],
  "token_used": null,
  "token_proposed": null,
  "responsive_adjustments": [],
  "explanation": "one sentence for the user"
}
```

---

## Notes for prompt authors

- **6% tolerance (Rule 1)** — for colour, 6% is computed as Euclidean distance in
  the HSL colour space normalised to 0–100 on each axis. For numeric properties
  (spacing, font-size), 6% is a simple relative difference `|new - token| / token`.
  The model performs this comparison from the `availableTokens` map and reports the
  winning token name in `token_used`.
- **`token_proposed`** — only non-null when no token fits AND `hasDesignSystem` is
  `true`. Contains `{name, value, css_var}` describing the token the model
  recommends adding. The orchestrator shows this proposal in the UI before committing;
  the user can accept or reject it. If the user accepts, the orchestrator calls B.10
  again with the proposed token already in `availableTokens`.
- **`responsive_adjustments`** — strings describing breakpoint-specific changes made
  alongside the primary edit. E.g. "Set `md:text-lg` to maintain relative sizing at
  tablet width." If no adjustments are needed, emit an empty array.
- **`explanation`** — the only user-facing field. One plain sentence. If a token
  was snapped, name it: "Set padding to `space-4` (the nearest token to 15px)."
  If a token is proposed: "No existing token matches — would you like to add
  `brand-highlight` (#f59e0b) to your design system?"
- **Inline styles are forbidden (Rule 3)** — the visual editor's source model is the
  canonical Tailwind `className` string in the component. An inline `style` prop would
  be invisible to the next codegen cycle and stripped by the Fixer. The only
  acceptable targets are: Tailwind class replacement in `className`, token value
  update in `tokens.css`, or a design-system token addition via `tokens.json`.
- **`sourceRange`** — line numbers from the file manifest (1-indexed). The model
  uses this to produce a tight `find` string for the patch op. If the range spans
  many lines, prefer the smallest unique snippet within it.
- **When `hasDesignSystem` is false** — Rule 2 does not apply. The model may write a
  literal directly into `tokens.css` (the one file where literals are allowed) and
  explain the choice. `token_proposed` must be `null`.
