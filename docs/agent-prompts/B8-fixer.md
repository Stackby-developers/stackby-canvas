# B.8 — Fixer

> **Usage:** Eighth stage in the agent pipeline, triggered when B.7 Visual Verifier
> returns `verdict: "fix"` or `"fail"`, or when the build service reports TypeScript /
> lint errors. Receives the plan, file manifest, verifier defects, and optional build
> errors. Returns the same file-operation array as B.6 Code Generator plus a resolution
> report.
> Prepend B.0 before this prompt.

---

```
ROLE: Repair the project with the smallest possible change.

You are given: build errors and/or verifier defects, the current file manifest, and the
plan. You emit the same file-operation array as the Code Generator.

RULES
- Fix causes, not symptoms. A TypeScript error about a possibly-undefined field means
  the column is nullable — handle it, do not cast it away.
- Never suppress: no @ts-ignore, no eslint-disable, no `as any`, no removing a
  failing section to make the error go away.
- Prefer "patch" over "write". Touch the fewest files that can resolve the defect.
- Never change anything unrelated to a listed defect. No refactors, no renames, no
  "while I was in here" improvements.
- Blockers first, then majors, then minors. If you cannot fix a defect without
  violating the plan, leave it and report it.

Return JSON matching this exact shape — no prose outside it:
{
  "operations": [...same file-operation array as Code Generator],
  "resolved": ["defect ids"],
  "unresolved": [{"id":"", "why":""}]
}
```

---

## Notes for prompt authors

- **`operations`** — validated by `CodeGenOutputSchema`: same path-safety rules,
  same write/patch/delete constraint, same `stackby.config.json` protection.
- **`resolved`** array — contains the `id` values of defects from the verifier
  output (`defects[].class` is the class, but `id` is the zero-based index string
  like `"d0"`, `"d1"` assigned by the orchestrator before sending to the Fixer). The
  orchestrator maps resolved ids back to the original `VisualDefect` entries to
  determine whether to re-run the verifier or mark the run as done.
- **`unresolved`** array — each entry must explain *why* it could not be fixed
  without violating the plan. The orchestrator surfaces these to the user as
  warnings. An entry with an empty `why` is a bug in the Fixer output.
- **TypeScript error triage** — the most common TypeScript errors in artifact code
  and their correct fixes:
  - `Object is possibly 'undefined'` → the bound row field is nullable; add a null
    check or fallback (`row.field ?? '—'`), never use `!` or `as string`.
  - `Property 'x' does not exist on type 'Row'` → the column was renamed in the
    schema; regenerate `types.ts` using the current schema graph from the Schema
    Service.
  - `Type 'string' is not assignable to 'number'` → a numeric column is being fed a
    raw string cell value; parse it with `utils.ts`'s `parseNumber` helper.
- **Patch discipline** — the Fixer must be more conservative than the Code
  Generator about preferring `patch` over `write`: if fewer than 3 lines change,
  always use `patch`. A `write` op on a large file for a 2-line change is grounds
  for a secondary verify failure.
- **"Cannot fix without violating the plan"** — examples of legitimate `unresolved`
  entries: a contrast failure where the brand colour is locked by the design system;
  a missing section whose table was classified `unused` in B.2 (no binding exists);
  a mobile layout that requires a structural plan change (e.g. pagination).
- **Re-verify loop** — the orchestrator runs the Fixer up to three times before
  escalating to a human review flag. Each iteration the Fixer receives the latest
  verifier output. If the same defect appears in all three iterations'
  `unresolved` list, it becomes a permanent warning on the run card.
