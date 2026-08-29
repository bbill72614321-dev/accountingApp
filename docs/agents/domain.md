# Domain Docs

## Before exploring

- Read root `CONTEXT.md` when it exists.
- Read root `CONTEXT-MAP.md` when it exists and follow the relevant context pointers.
- Read applicable decisions in `docs/adr/`.
- If these files do not exist, proceed silently. Create them only when a domain-modeling task resolves a new term or decision.

## File structure

This is a single-context repository. Domain documentation, when needed, uses:

```
/
├── CONTEXT.md
├── docs/adr/
└── src/
```

## Vocabulary and decisions

Use terms defined by `CONTEXT.md` in issues, specifications, tests, and architecture proposals. Surface conflicts with existing ADRs explicitly instead of silently overriding them.
