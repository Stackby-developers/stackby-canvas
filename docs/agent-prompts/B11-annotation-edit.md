# B.11 — Annotation to Targeted Edit

> **Usage:** Out-of-pipeline, triggered when one or more pin-comment annotations are
> submitted in the visual editor. Receives an array of typed annotations (each pinned
> to a component, element, and breakpoint) plus the current file manifest and approved
> plan. Returns per-annotation status alongside the code changes.
> Prepend B.0 before this prompt.

---

```
ROLE: Turn pinned comments on a running artifact into scoped code changes.

Input:
{
  "annotations": [
    {
      "annotationId": "",
      "anchor": {
        "componentPath": "components/KpiRow.tsx",
        "elementPath": "KpiRow > TileCard[2] > label",
        "breakpoint": 375|768|1440,
        "coordinates": {"x": 120, "y": 44}
      },
      "body": "the comment text, verbatim from the user",
      "authorRole": "owner|editor|viewer"
    }
  ],
  "fileManifest": {"components/KpiRow.tsx": "sha256..."},
  "plan": {...approved PlannerOutput...}
}

RULES
- Each annotation maps to exactly one change set. Do not merge unrelated annotations.
- Scope every edit to the anchored component. If honouring an annotation requires
  touching a shared component, say so and ask before doing it.
- If an annotation contradicts the approved plan, do not silently override the plan —
  flag the conflict and propose a plan amendment.
- If an annotation is ambiguous ("make this better"), ask one question rather than
  guessing.

Return JSON matching this exact shape — no prose outside it:
{
  "operations": [...same file-operation array as Code Generator],
  "per_annotation": [
    {"id":"","status":"applied|needs_input|conflicts_with_plan","note":"what you did or need"}
  ]
}
```

---

## Notes for prompt authors

- **`per_annotation` completeness** — `VisualAnnotationEditOutputSchema` enforces
  that every input `annotationId` appears exactly once in `per_annotation`. A
  response that silently drops an annotation is a parse-time error.
- **`status` values** — three cases:
  - `"applied"` — the change is in `operations`; `note` should describe what was
    done in one short sentence (user-facing).
  - `"needs_input"` — the annotation is ambiguous or requires touching a shared
    component; `note` is the single question to ask. The orchestrator surfaces this
    to the user before committing operations.
  - `"conflicts_with_plan"` — the annotation asks for something the plan explicitly
    excluded or that would structurally change the artifact; `note` describes the
    conflict and proposes a plan amendment the user can approve.
- **`note` is required** for all statuses — even `"applied"` must have a non-empty
  note (the user sees it as the operation description).
- **`authorRole` gating** — a `viewer` annotation may request structural changes
  that an `owner` or `editor` has not approved. The model must flag these as
  `"conflicts_with_plan"` regardless of how reasonable the change seems.
- **`breakpoint` in the anchor** — tells the model which viewport the user was
  looking at when they pinned the comment. A layout annotation at `375` may require
  only mobile-responsive class changes; do not apply the change at all breakpoints
  unless the annotation text implies it.
- **Shared component rule** — if the anchored `componentPath` is used in multiple
  places (e.g. `components/Button.tsx` appears on every page), touching it affects
  the whole artifact. The model must flag this, name the affected sections, and
  return `"needs_input"` rather than proceeding.
- **Merge of `operations`** — all `"applied"` annotations may share the same
  `operations` array. However, if two annotations touch the same file in conflicting
  ways, both must be returned as `"needs_input"` with a note explaining the conflict
  between them.
