## Entry: 2026-11-12 Chimera port contract fix
- Kiro surface used: IDE
- Feature(s) used: vibe, PBT
- What I asked / how I structured it: Chimera wishes (counter -> badge) failed on port/schema mismatch. Asked for a simplified, non-hard-coded fix.
- What worked: Making the port contract structured data. The spec step returns `ports` and `permissions` as JSON, `applyContract()` enforces them on the manifest after build, repair and heal, and the immune system cross-checks `nerve.emit` / `nerve.onIn` literals against declared ports. A mocked-LLM test deliberately returns wrong ports and still ends with the right manifest.
- What failed or surprised me: The repo had moved on since my first survey (`nerve.onIn`, tolerant port lookup already existed), so I re-read files before editing. The old `schemasCompatible` treated integer and number as interchangeable in both directions.
- Evidence: `packages/doctor/src/__tests__/chimera-pipeline.test.ts`, `contract.test.ts` (property: output ports equal contract ports, every out port has an emit permission), `packages/immune/src/__tests__/manifest.test.ts` (property: undeclared emit/onIn port is rejected), `apps/web/src/__tests__/chimera-linking.test.ts`.
- Not verified: a live LLM run and a browser e2e of the full wish flow.
