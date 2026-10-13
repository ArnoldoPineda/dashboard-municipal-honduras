## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Subagents
- `code-reviewer` — zero-context code review. Returns PASS / PASS WITH NOTES / NEEDS CHANGES verdict, focusing on correctness, security, and RLS/data integrity.
- `research` — deep research via web search and file access. Returns concise sourced findings without polluting main context.
- `qa` — generates and runs tests for a snippet/module, reports pass/fail with edge cases found.

## Design & Build Workflow
For any non-trivial code change:
1. Write the code.
2. Run `code-reviewer` on it.
3. Run `qa` on it.
4. Only then consider it shippable.

This workflow applies automatically whenever building or modifying non-trivial code — not just when explicitly requested.
