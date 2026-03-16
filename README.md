# TLI Shared Model Game

Static GitHub Pages site for **Shared Model Under Pressure** (INCOSE TLI Cohort 9).

## Play

- GitHub Pages: `https://haitaowu12.github.io/TLI_Shared_Model_game/`
- Local:
  ```bash
  python3 -m http.server 5173
  ```
  then open `http://localhost:5173`

## What this trains

This is a serious game about holding a **Shared Model** under delivery pressure.

- If you don’t explicitly tag your response to Shared Model fields, it **doesn’t count**.
- Stakeholders interrupt on a script (30s / 60s / 90s) and add extra tag requirements.
- Repeated tactical choices trigger cumulative consequences (including a **Rework Cascade** after 3 tactical patches).

## How to play (solo “Leader in the Arena”)

1. Click **Start** to enter Round 1.
2. Choose a response mode:
   - **Mode A — Tactical Patch**: short-term relief, long-term damage.
   - **Mode B — Strategic Pause**: protects architecture, costs short-term confidence.
   - **Mode C — Model Reframe**: best for Shared Model Stability (requires completing all sections).
3. Fill in the response fields and select Shared Model **tags** (“chips”) that support each section.
4. Handle stakeholder interrupts (they may require additional tags).
5. Click **Submit** to see the round debrief and updated meters.

## Controls

- `1` / `2` / `3`: select Mode A / B / C
- `Enter`: Submit
- `F`: Fullscreen
- `Esc`: Close popups
- **Shared Model Canvas** button: opens the authoritative one-page reference

## Scoring (high level)

The game tracks five meters:

- **Shared Model Stability** (starts 100)
- **Vision Integrity**
- **Stakeholder Confidence** (weighted by stakeholder DiSC preferences)
- **System Health**
- **Burn Rate**

Mode C has explicit requirements (enforced):

- Purpose Anchor: `Vision` + one of `Rationale` / `Success Criteria` / `Key Performance Indicators`
- Immediate 48h Action: `Strategy` + `Responsible` or `Accountable`
- Boundary Statement: `Scope` + `Logistical Constraints`
- Lifecycle Impact: `Key Performance Indicators` and/or `As-is State`
- Stakeholder Message: `Internal/External Stakeholder Context` + `Team Governance`

## Smoke test mode (for automation)

Append `?smoke=1` to auto-play a single round to the debrief screen:

- `http://localhost:5173/?smoke=1`

## Notes
- This is a static HTML/CSS/JS site (no backend, no API keys).
- Content uses the real Cohort 9 Shared Model field taxonomy with a fictional system and scripted scenarios.
