# B.12 — Stack Generator

> **Usage:** Out-of-pipeline stage, triggered when a user requests an artifact but
> has no suitable Stackby stack. Receives only the user request (plus optionally a
> prior conversation) and returns a complete stack definition ready to pass to the
> Stackby create-stack API.
> Prepend B.0 before this prompt.

---

```
ROLE: Design a realistic Stackby stack for a request when the user has no suitable data.

Return JSON matching the Stackby create-stack template shape:
{
  "name":"", "icon":"", "color":"#RRGGBB",
  "tables":[
    {"key":"stable_key","name":"",
     "columns":[
       {"name":"","columnType":"text|multilineText|number|select|multiSelect|date|
                                checkbox|url|email|phone|rating|progress|duration|
                                currency|percent|attachment|collaborator|
                                link|lookup|rollup|count|formula",
        "options":["for select types"],
        "linkToTableKey":"for link/lookup/rollup/count",
        "linkColumnName":"the link column on THIS table",
        "linkedColumnName":"the column on the linked table to pull or roll up",
        "formulaText":"for formula columns"}],
     "rows":[{"rowKey":"r1","fields":{"Column":"value",
              "LinkColumn":{"__linkRowKeys":["r_other"]}}}]}
  ]
}

RULES
- Order tables so that link targets are defined before the tables that reference them.
- The first table maps to the stack's default first sheet.
- Base columns first, then link columns, then lookup/rollup/count, then formula —
  derived columns must come after what they derive from.
- 3 to 6 tables. 20 to 40 rows in the primary table, 5 to 15 in supporting tables.
- Sample data must be plausible and internally consistent: dates in a sensible range
  and order, statuses distributed realistically (not uniformly), names culturally
  varied, currency values with realistic magnitude, and roughly 10-15% of optional
  fields intentionally empty so empty states get exercised.
- Never generate real personal data. Never use real company names in a way that implies
  endorsement.
```

---

## Notes for prompt authors

- **Table ordering** — the `superRefine` on `StackGeneratorOutputSchema` verifies
  that no table references a `linkToTableKey` for a table that appears later in the
  `tables` array. If the model reverses the order, the schema parse will fail.
- **`key` field** — used internally as a stable reference identifier for linking.
  Must be lowercase, hyphenated, no spaces. Never shown to users. The Stackby API
  uses this as an idempotency key.
- **Column ordering rule** — enforced structurally: within a table, the schema
  validates that `formula`, `lookup`, `rollup`, and `count` columns do not appear
  before all `link` columns. (The full topological sort is not validated — the
  orchestrator performs this before calling the Stackby API.)
- **`options`** — required for `select` and `multiSelect` columns; optional
  (ignored) for all other types. The schema validates presence when the column type
  is select or multiSelect.
- **`formulaText`** — required for `formula` columns; the schema rejects a formula
  column without it.
- **`linkToTableKey`** — required for `link`, `lookup`, `rollup`, and `count`
  columns; must match one of the `key` values declared earlier in the `tables` array.
- **`linkColumnName` / `linkedColumnName`** — for `lookup`, `rollup`, `count`: the
  schema validates that both are present. For a plain `link` column, they are
  optional.
- **Row data realism** — the 10–15% empty-field rule is guidance, not schema-
  enforced. Sample data must exercise the empty-state rendering of any component
  that will be generated from this stack in subsequent B.1–B.9 runs.
- **No real personal data** — names, emails, and phone numbers must be fictional.
  Company names may use generic descriptors ("Acme Systems", "Blue Bridge Co.")
  but must not imply real entities. This is Invariant 3 in B.0 applied to generated
  seed data.
- **`icon`** — an emoji or a Stackby icon identifier (e.g. `"🏗"`, `"tasks"`).
  The schema validates non-empty string; the Stackby API accepts either form.
- **`color`** — hex `#RRGGBB`, validated by the schema.
