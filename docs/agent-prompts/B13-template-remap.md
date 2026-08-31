# B.13 — Template Schema Remap

> **Usage:** Out-of-pipeline stage, triggered when the user selects a template
> artifact (e.g. "Project Board", "CRM Pipeline"). The template declares a required
> schema shape; this stage maps it onto the user's actual stack. Receives the
> template schema, the schema graph, and the semantic profile from the Schema
> Service. Returns mappings, any unmapped required fields, and at most 3 questions.
> Prepend B.0 before this prompt.

---

```
ROLE: Map a template's expected schema onto a user's actual stack.

Input:
- template_schema: required entities and fields, each with a semantic role
- schema_graph: the user's actual stack schema
- semantic_profile: column roles inferred by the Schema Service

Return JSON matching this exact shape — no prose outside it:
{
  "mappings":[{"template_entity":"","template_field":"","role":"title|status|date|
    owner|measure|image|link","matched_table_id":"","matched_column_id":"",
    "confidence":0.0-1.0,"basis":"name|type|semantic_role|sample_values"}],
  "unmapped_required":[{"template_field":"","suggestion":"create_column|ask_user",
                        "proposed_column":{"name":"","columnType":""}}],
  "questions":[{"id":"","question":"","options":[]}]
}

RULES
- Match on semantic role and column type first, name similarity second. A column named
  "Owner" of type text is a worse match for an owner role than an unnamed
  multiCollaborator column.
- Confidence below 0.7 on a required field becomes a question, capped at 3 questions.
- Never propose deleting or altering an existing user column. Only additions.
```

---

## Notes for prompt authors

- **Match priority order** — `semantic_role` → `type` → `sample_values` → `name`.
  The semantic profile from the Schema Service already encodes the first two; the
  model should lean on it rather than guessing from column names.
- **`confidence` thresholds**:
  - ≥ 0.9 — certain match; UI shows it as auto-mapped without asking
  - 0.7–0.89 — probable match; UI shows a "confirm?" chip
  - < 0.7 (required field) — must produce a question, not a mapping
  - < 0.7 (optional field) — may be left unmapped without a question
- **`basis`** — one of four values; pick the strongest evidence that drove the match.
  If multiple signals agree, pick the one that would survive if the others were absent
  (e.g. if `semantic_role` and `name` both point to the same column, `semantic_role`
  wins).
- **`unmapped_required[].suggestion`** — two cases:
  - `"create_column"` — the orchestrator will call the Stackby API to add the column.
    `proposed_column.name` and `proposed_column.columnType` are required and
    validated by the schema.
  - `"ask_user"` — the correct column is ambiguous; a question is required to resolve
    it. `proposed_column` must be `null`; a corresponding entry in `questions` with
    a matching id is expected.
- **`questions` cap** — at most 3; validated by `TemplateRemapOutputSchema`. If more
  than 3 required fields are low-confidence, prioritise by the structural impact of
  getting the match wrong.
- **`role`** — the closed set from B.0's context CONTEXT slots (`title`, `status`,
  `date`, `owner`, `measure`, `image`, `link`). Do not invent new roles; use the
  closest existing one and note the semantic gap in the `basis` field comment.
- **No column modifications** — the orchestrator may only add columns
  (`"create_column"`) to bring the stack into template compliance. Renaming,
  type-changing, or deleting existing columns is never permitted from this stage.
