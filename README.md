# Shared Model Under Pressure

Production rebuild for the INCOSE TLI Shared Model training game.

This version is a React + Vite + TypeScript app focused on self-guided practice: inspect a pressure scenario, write a model-anchored response, tag Shared Model fields, handle stakeholder interrupts, and generate a debrief with transfer action.

The Shared Model content is grounded in `Paper-151.pdf`, especially the page 18 overview canvas. The game now teaches the canvas before play: Vision and Scope frame the work; stakeholder context bounds the sides; Rationale, As-is State, Strategy, Team Governance, and KPIs carry the working core; roles and Success Criteria clarify accountability; Logistical Constraints and Resources/Knowledge Management ground execution.

## Current Product Slice

- One guided onboarding path
- One complete scenario from the existing TLI prototype
- Three stakeholder interrupts
- Mode A/B/C response posture
- Shared Model tag picker
- Rubric-based debrief
- Local autosave and JSON export

## Architecture

- `src/domain`: serializable game state, reducer, scoring, interrupt schedule
- `src/content`: Shared Model fields, scenario, stakeholders, rubric, validation
- `src/ui`: React screens and form controls
- `src/rendering`: model board, meters, pressure timeline
- `src/persistence`: local autosave, legacy state migration, export
- `legacy/static-v1`: archived static prototype

## Commands

```bash
npm install
npm run dev
npm test
npm run build
npm run test:e2e
```

## Design Direction

Godot is intentionally out of scope. The learning surface is text, tags, debrief, accessibility, workshop transfer, and static web deployment. Phaser or PixiJS can be added later as renderer layers if playtests show that a richer board animation improves transfer.
