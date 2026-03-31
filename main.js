import { SHARED_MODEL_FIELDS, fieldById } from "./data/sharedModel.js";
import { SCENES } from "./data/scenes.js";
import { stakeholderById } from "./data/stakeholders.js";
import { CONSEQUENCES } from "./data/consequences.js";
import { MODES, MODE_LABEL, validateModeCResponse, computeRoundDeltas, applyDeltas } from "./lib/scoring.js";
import { clamp, nowIso, pick, uniq } from "./lib/utils.js";

const $ = (sel) => document.querySelector(sel);

const canvas = $("#game-canvas");
const ctx = canvas.getContext("2d");
const screenRoot = $("#screen-root");
const stageHint = $("#stage-hint");
const modalRoot = $("#modal-root");

const btnReset = $("#btn-reset");
const btnFullscreen = $("#btn-fullscreen");
const btnHelp = $("#btn-help");

const DEFAULT_METERS = {
  sharedModelStability: 100,
  visionIntegrity: 80,
  stakeholderConfidence: 70,
  systemHealth: 70,
  burnRate: 20,
};

const DIFFICULTY = {
  training: { label: "Training", seconds: 150, injectionPauses: true },
  standard: { label: "Standard", seconds: 120, injectionPauses: false },
  hardcore: { label: "Hardcore", seconds: 105, injectionPauses: false },
};

const SHARED_MODEL_CANVAS = {
  vision:
    "Reduce rural emergency response time by 30% through a coordinated national drone response network people can trust.",
  scope:
    "Emergency-response dispatch + drone operations + incident reporting. Out of scope: non-emergency commercial use and defense missions.",
  rationale:
    "Rural response times are too long; preventable harm occurs when responders can’t reach scenes quickly and safely.",
  as_is_state:
    "Fragmented regional dispatch systems, inconsistent training, limited telemetry, and brittle integrations with legacy IT.",
  strategy:
    "Ship a safe core dispatch + telemetry platform; integrate with legacy via stable interfaces; iterate with field feedback loops and transparent KPIs.",
  success_criteria:
    "Within 12 months: 30% response-time reduction in pilot regions while maintaining compliance and measurable public trust.",
  kpis:
    "Median rural response time; safety incidents per 1,000 flights; training completion; demo uptime; sustainment cost trend; trust survey score.",
  internal_stakeholders:
    "Engineering, Operations, Safety/Training, Procurement, Legal/Compliance, Finance, Executive sponsors.",
  external_stakeholders:
    "First responders, regulators, rural communities, media, interoperability partners, vendors/contractors.",
  resources_knowledge:
    "Runbooks, incident reviews, decision logs, onboarding pack, shared glossary, and structured retrospectives after each release.",
  tools_processes:
    "Issue tracking, incident timeline tool, architecture decision records, integration test harness, comms playbook for public demos.",
  logistical_constraints:
    "Budget capped; ministerial demo dates; multi-time-zone teams; regulatory approvals; legacy system constraints.",
  team_governance:
    "Weekly alignment review; decision records; explicit escalation paths; stakeholder updates at set cadence; ‘stop–think–reflect’ reset allowed.",
  team: "Engineering, Ops, Safety, Procurement, Data/AI, External contractor representatives.",
  project_manager: "Program Lead (rotates in training simulation).",
  responsible: "Feature owner per workstream; named on each 48h action.",
  accountable: "Program Lead accountable for integrated outcome and public trust posture.",
};

let state = makeFreshState();
const SMOKE = new URLSearchParams(window.location.search).get("smoke") === "1";

function makeFreshState() {
  return {
    version: 1,
    createdAt: nowIso(),
    screen: "title", // title | briefing | round | debrief | end
    difficulty: "standard",
    roundIndex: 0,
    meters: { ...DEFAULT_METERS },
    tacticalCount: 0,
    persistentMods: {},
    lastConsequence: null,
    lastRoundSummary: null,
    tagsUsedCounts: Object.fromEntries(SHARED_MODEL_FIELDS.map((f) => [f.id, 0])),
    driftTimeline: [],
    // Round-local
    round: null,
    ui: { update: () => {} },
  };
}

function resetAll() {
  closeModal();
  state = makeFreshState();
  setScreen("title");
  stageHint.textContent = "Tip: Use the Shared Model tags. If it’s not tagged, it doesn’t count.";
}

btnReset.addEventListener("click", resetAll);

btnFullscreen.addEventListener("click", () => toggleFullscreen());
document.addEventListener("keydown", (e) => {
  if (e.key === "f" || e.key === "F") toggleFullscreen();
});

btnHelp?.addEventListener("click", () => showHelpModal());
document.addEventListener("keydown", (e) => {
  if (e.key === "?" || (e.shiftKey && e.key === "/")) showHelpModal();
});

function toggleFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement) el.requestFullscreen?.();
  else document.exitFullscreen?.();
}

// ---------- Modal ----------
function openModal({ title, body, tone = "default", buttons = [] }) {
  modalRoot.hidden = false;
  modalRoot.innerHTML = "";

  const modal = document.createElement("div");
  modal.className = "modal";

  const head = document.createElement("div");
  head.className = "modal__head";

  const h = document.createElement("div");
  h.className = "modal__title";
  h.textContent = title;
  head.appendChild(h);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "btn btn--ghost";
  closeBtn.textContent = "Close (Esc)";
  closeBtn.addEventListener("click", closeModal);
  head.appendChild(closeBtn);

  const content = document.createElement("div");
  content.className = "modal__body";
  if (tone === "danger") content.classList.add("danger");
  if (typeof body === "string") content.textContent = body;
  else content.appendChild(body);

  const footer = document.createElement("div");
  footer.className = "card";

  const row = document.createElement("div");
  row.className = "row";
  for (const b of buttons) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `btn ${b.variant || "btn--primary"}`;
    btn.textContent = b.label;
    btn.addEventListener("click", () => {
      if (b.onClick) b.onClick();
    });
    row.appendChild(btn);
  }
  footer.appendChild(row);

  modal.appendChild(head);
  modal.appendChild(content);
  if (buttons.length) modal.appendChild(footer);

  modalRoot.appendChild(modal);
}

function closeModal() {
  modalRoot.hidden = true;
  modalRoot.innerHTML = "";
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modalRoot.hidden) closeModal();
});

// ---------- Screens ----------
function setScreen(next) {
  state.screen = next;
  screenRoot.innerHTML = "";
  if (next === "title") renderTitle();
  else if (next === "briefing") renderBriefing();
  else if (next === "round") renderRound();
  else if (next === "debrief") renderDebrief();
  else if (next === "end") renderEnd();
  else renderTitle();
  renderCanvas();
}

function renderTitle() {
  const wrap = document.createElement("div");
  wrap.className = "card";

  const title = document.createElement("h2");
  title.className = "card__title";
  title.textContent = "Enter the Arena (Solo)";
  wrap.appendChild(title);

  const desc = document.createElement("div");
  desc.className = "card__desc";
  desc.innerHTML =
    "<strong>You are the Leader.</strong> Stakeholders interrupt on a script. Your job is to keep the Shared Model alive under pressure.<br/><br/><strong>Rule:</strong> if a response isn’t tagged to Shared Model fields, it doesn’t count.";
  wrap.appendChild(desc);

  const divider = document.createElement("div");
  divider.className = "divider";
  wrap.appendChild(divider);

  const img = document.createElement("img");
  img.className = "hero-img";
  img.alt = "Cohort 9 Shared Model template graphic";
  img.src = "./assets/cohort9_shared_model_template.svg";
  wrap.appendChild(img);

  const how = document.createElement("div");
  how.className = "callout";
  how.innerHTML =
    "<strong>How to play (90 seconds):</strong><ol class='steps'>" +
    "<li>Click <strong>Start</strong> to begin Round 1.</li>" +
    "<li>Pick Mode A / B / C (Mode C is best, but stricter).</li>" +
    "<li>Write your response <strong>and</strong> select Shared Model tag chips for each section.</li>" +
    "<li>When interrupted, satisfy the new required tag before submitting.</li>" +
    "<li>Submit → read the Debrief → next round.</li>" +
    "</ol>";
  wrap.appendChild(how);

  const row = document.createElement("div");
  row.className = "row";

  const diffLabel = document.createElement("div");
  diffLabel.className = "pill";
  diffLabel.innerHTML = `<span class="pill__dot" style="background: var(--teal)"></span> Difficulty`;
  row.appendChild(diffLabel);

  for (const [id, cfg] of Object.entries(DIFFICULTY)) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `btn ${state.difficulty === id ? "btn--primary" : "btn--ghost"}`;
    b.textContent = `${cfg.label} (${cfg.seconds}s)`;
    b.addEventListener("click", () => {
      state.difficulty = id;
      setScreen("title");
    });
    row.appendChild(b);
  }
  wrap.appendChild(row);

  const divider2 = document.createElement("div");
  divider2.className = "divider";
  wrap.appendChild(divider2);

  const actions = document.createElement("div");
  actions.className = "row";

  const start = document.createElement("button");
  start.id = "start-btn";
  start.type = "button";
  start.className = "btn btn--primary";
  start.textContent = "Start";
  start.addEventListener("click", () => {
    beginRound();
    setScreen("round");
  });
  actions.appendChild(start);

  const canvasBtn = document.createElement("button");
  canvasBtn.type = "button";
  canvasBtn.className = "btn btn--ghost";
  canvasBtn.textContent = "Open Shared Model Canvas (Reference)";
  canvasBtn.addEventListener("click", () => showSharedModelCanvasModal());
  actions.appendChild(canvasBtn);

  wrap.appendChild(actions);

  screenRoot.appendChild(wrap);

  state.ui.update = () => {};
}

function renderBriefing() {
  const scene = SCENES[state.roundIndex];
  const wrap = document.createElement("div");
  wrap.className = "card";

  const title = document.createElement("h2");
  title.className = "card__title";
  title.textContent = "Briefing";
  wrap.appendChild(title);

  const desc = document.createElement("div");
  desc.className = "card__desc";
  desc.textContent =
    "Single fictional system. Scripted scenes. Your job: hold the shared model under pressure.";
  wrap.appendChild(desc);

  const divider = document.createElement("div");
  divider.className = "divider";
  wrap.appendChild(divider);

  const sceneCard = document.createElement("div");
  sceneCard.className = "grid";

  const pillRow = document.createElement("div");
  pillRow.className = "row";

  const p1 = pill("Round", `${state.roundIndex + 1} / ${SCENES.length}`, "var(--amber)");
  const p2 = pill("Phase", scene.phase, "var(--teal)");
  pillRow.appendChild(p1);
  pillRow.appendChild(p2);
  sceneCard.appendChild(pillRow);

  const t = document.createElement("div");
  t.className = "card__desc";
  t.textContent = `${scene.title}: ${scene.setup}`;
  sceneCard.appendChild(t);

  const st = document.createElement("div");
  st.className = "card__desc";
  st.textContent = `System context: ${scene.system_context}`;
  sceneCard.appendChild(st);

  const constraints = document.createElement("div");
  constraints.className = "card__desc";
  constraints.textContent = `Constraints: ${scene.constraints.join(" • ")}`;
  sceneCard.appendChild(constraints);

  wrap.appendChild(sceneCard);

  const divider2 = document.createElement("div");
  divider2.className = "divider";
  wrap.appendChild(divider2);

  const actions = document.createElement("div");
  actions.className = "row";

  const openCanvas = document.createElement("button");
  openCanvas.type = "button";
  openCanvas.className = "btn btn--ghost";
  openCanvas.textContent = "Shared Model Canvas";
  openCanvas.addEventListener("click", () => showSharedModelCanvasModal());
  actions.appendChild(openCanvas);

  const begin = document.createElement("button");
  begin.type = "button";
  begin.className = "btn btn--primary";
  begin.textContent = "Begin Round";
  begin.addEventListener("click", () => {
    beginRound();
    setScreen("round");
  });
  actions.appendChild(begin);

  wrap.appendChild(actions);
  screenRoot.appendChild(wrap);
  state.ui.update = () => {};
}

function beginRound() {
  const diff = DIFFICULTY[state.difficulty] || DIFFICULTY.standard;
  const scene = SCENES[state.roundIndex];
  const stakeholders = scene.stakeholders.map(stakeholderById).filter(Boolean);

  state.round = {
    id: scene.id,
    startedAt: nowIso(),
    scene,
    stakeholders,
    secondsTotal: diff.seconds,
    secondsLeft: diff.seconds,
    injectionIndex: 0,
    activeInjection: null,
    requiredTags: new Set(), // added as injections happen
    pausedForInjection: false,

    mode: null,
    textBySection: {},
    tagsBySection: {},
    timedOut: false,
  };
}

function renderRound() {
  const wrap = document.createElement("div");
  wrap.className = "card";

  const title = document.createElement("h2");
  title.className = "card__title";
  title.textContent = "Round";
  wrap.appendChild(title);

  const topRow = document.createElement("div");
  topRow.className = "row";

  const timerPill = pill("Timer", "", "var(--rose)");
  timerPill.id = "pill-timer";
  topRow.appendChild(timerPill);

  const modePill = pill("Mode", "Choose A/B/C", "var(--amber)");
  modePill.id = "pill-mode";
  topRow.appendChild(modePill);

  wrap.appendChild(topRow);

  const desc = document.createElement("div");
  desc.className = "card__desc";
  desc.id = "round-scene-desc";
  desc.textContent = `${state.round.scene.title}: ${state.round.scene.setup}`;
  wrap.appendChild(desc);

  const divider = document.createElement("div");
  divider.className = "divider";
  wrap.appendChild(divider);

  const modeRow = document.createElement("div");
  modeRow.className = "row";

  const btnA = modeButton("1", MODE_LABEL[MODES.A], "btn--danger", () => selectMode(MODES.A));
  const btnB = modeButton("2", MODE_LABEL[MODES.B], "btn--ghost", () => selectMode(MODES.B));
  const btnC = modeButton("3", MODE_LABEL[MODES.C], "btn--primary", () => selectMode(MODES.C));
  modeRow.appendChild(btnA);
  modeRow.appendChild(btnB);
  modeRow.appendChild(btnC);
  wrap.appendChild(modeRow);

  const divider2 = document.createElement("div");
  divider2.className = "divider";
  wrap.appendChild(divider2);

  const required = document.createElement("div");
  required.id = "required-tags";
  required.className = "card__desc";
  required.textContent = "Interrupt requirements: (none yet)";
  wrap.appendChild(required);

  const guidance = document.createElement("div");
  guidance.id = "round-guidance";
  guidance.className = "callout";
  guidance.innerHTML =
    "<strong>Tip:</strong> Tags are the scoring system. Under pressure, the model disappears first—fight that drift.";
  wrap.appendChild(guidance);

  const formRoot = document.createElement("div");
  formRoot.id = "form-root";
  wrap.appendChild(formRoot);

  const divider3 = document.createElement("div");
  divider3.className = "divider";
  wrap.appendChild(divider3);

  const actions = document.createElement("div");
  actions.className = "row";

  const canvasBtn = document.createElement("button");
  canvasBtn.type = "button";
  canvasBtn.className = "btn btn--ghost";
  canvasBtn.textContent = "Shared Model Canvas";
  canvasBtn.addEventListener("click", () => showSharedModelCanvasModal());
  actions.appendChild(canvasBtn);

  const submit = document.createElement("button");
  submit.type = "button";
  submit.className = "btn btn--primary";
  submit.id = "btn-submit";
  submit.textContent = "Submit (Enter)";
  submit.addEventListener("click", () => submitRound());
  actions.appendChild(submit);

  wrap.appendChild(actions);
  screenRoot.appendChild(wrap);

  const update = () => {
    const t = $("#pill-timer");
    if (t) t.querySelector(".pill__value").textContent = formatTimer(state.round.secondsLeft);
    const m = $("#pill-mode");
    if (m) m.querySelector(".pill__value").textContent = state.round.mode ? MODE_LABEL[state.round.mode] : "Choose A/B/C";

    const req = $("#required-tags");
    const reqTags = Array.from(state.round.requiredTags);
    if (req) {
      req.textContent = reqTags.length
        ? `Interrupt requirements: ${reqTags
            .map((id) => fieldById(id)?.label || id)
            .join(" • ")}`
        : "Interrupt requirements: (none yet)";
    }

    const guidance = $("#round-guidance");
    if (guidance) {
      const allTags = uniq(
        Object.values(state.round.tagsBySection || {})
          .flat()
          .filter(Boolean),
      );
      const unmetReq = reqTags.filter((t) => !new Set(allTags).has(t));

      if (state.round.mode === MODES.C) {
        const v = validateModeCResponse({
          textBySection: state.round.textBySection,
          tagsBySection: state.round.tagsBySection,
        });
        const checklist = v.ok
          ? "<strong>Mode C checklist:</strong> All required tags + sections are satisfied. Submit when ready."
          : `<strong>Mode C checklist:</strong> ${
              v.violations.length ? v.violations[0].message : "Complete all sections + add at least one tag per section."
            }`;
        const reqLine = unmetReq.length
          ? `<div class="card__desc" style="margin-top:6px"><strong>Interrupt tags missing:</strong> ${unmetReq
              .map((t) => fieldById(t)?.label || t)
              .join(", ")}</div>`
          : "";
        guidance.innerHTML = `${checklist}${reqLine}`;
      } else if (state.round.mode) {
        const tagCount = allTags.length;
        const reqLine = unmetReq.length
          ? ` Missing interrupt tag(s): ${unmetReq.map((t) => fieldById(t)?.label || t).join(", ")}.`
          : "";
        guidance.innerHTML = `<strong>Mode ${state.round.mode === MODES.A ? "A" : "B"} tip:</strong> Choose tags that anchor your message (aim for 2+). Tag count: ${tagCount}.${reqLine}`;
      } else {
        guidance.innerHTML =
          "<strong>Tip:</strong> Tags are the scoring system. Under pressure, the model disappears first—fight that drift.";
      }
    }
  };

  state.ui.update = update;
  update();
  renderModeForm();

  if (SMOKE) runSmokeScriptForCurrentRound();
}

function runSmokeScriptForCurrentRound() {
  if (!state.round || state.round.__smokeDone) return;
  state.round.__smokeDone = true;

  // Minimal deterministic “autoplay” for the Playwright loop.
  // Goal: exercise interrupts + required tags + Mode C scoring + debrief.
  queueMicrotask(() => {
    selectMode(MODES.C);

    state.round.textBySection.purpose_anchor = "Purpose: shorten rural emergency response time safely, without compromising trust.";
    state.round.tagsBySection.purpose_anchor = ["vision", "rationale"];

    state.round.textBySection.immediate_48h_action =
      "Within 48h: triage defects by impact on responder outcomes; assign an owner; publish a focused mitigation plan.";
    state.round.tagsBySection.immediate_48h_action = ["strategy", "responsible"];

    state.round.textBySection.boundary_statement =
      "Non‑negotiables: safety checks remain; scope stays on emergency missions; budget/time constraints are explicit.";
    state.round.tagsBySection.boundary_statement = ["scope", "logistical_constraints"];

    state.round.textBySection.lifecycle_impact =
      "Lifecycle: prioritize telemetry and integration tests to avoid invisible sustainment cost and rework cascades.";
    state.round.tagsBySection.lifecycle_impact = ["kpis", "as_is_state"];

    state.round.textBySection.stakeholder_message =
      "Message: align internal/external stakeholders on what won’t be compromised and how we govern decisions under pressure.";
    state.round.tagsBySection.stakeholder_message = ["external_stakeholders", "team_governance"];

    // Trigger interrupts (30s/60s/90s) deterministically.
    window.advanceTime(95000);
    if (!modalRoot.hidden) closeModal();

    submitRound();
  });
}

function renderModeForm() {
  const root = $("#form-root");
  if (!root) return;
  root.innerHTML = "";

  if (!state.round.mode) {
    const msg = document.createElement("div");
    msg.className = "card__desc";
    msg.textContent = "Choose a response mode. Under pressure, your default will be revealed.";
    root.appendChild(msg);
    return;
  }

  if (state.round.mode === MODES.C) {
    root.appendChild(renderModeCForm());
    return;
  }

  // Mode A/B: smaller structured response (still taggable).
  const label = document.createElement("label");
  label.textContent = "One-line plan (tag it to the Shared Model)";
  root.appendChild(label);

  const ta = document.createElement("textarea");
  ta.placeholder = "Write a concise response. If you don’t tag it, it doesn’t count.";
  ta.value = state.round.textBySection.summary || "";
  ta.addEventListener("input", () => {
    state.round.textBySection.summary = ta.value;
  });
  root.appendChild(ta);

  const tagLabel = document.createElement("label");
  tagLabel.style.marginTop = "10px";
  tagLabel.textContent = "Tags";
  root.appendChild(tagLabel);

  const chips = createChipset({
    selected: new Set(state.round.tagsBySection.summary || []),
    onToggle: (id, isSelected) => {
      const next = new Set(state.round.tagsBySection.summary || []);
      if (isSelected) next.add(id);
      else next.delete(id);
      state.round.tagsBySection.summary = Array.from(next);
    },
  });
  root.appendChild(chips);
}

function renderModeCForm() {
  const container = document.createElement("div");
  container.className = "grid";

  container.appendChild(
    modeCSection({
      id: "purpose_anchor",
      title: "Purpose Anchor",
      helper: "Must tag: Vision + one of Rationale / Success Criteria / KPIs",
      placeholder: "Restate the long-term product intent without corporate wallpaper.",
    }),
  );

  container.appendChild(
    modeCSection({
      id: "immediate_48h_action",
      title: "Immediate 48h Action",
      helper: "Must tag: Strategy + Responsible or Accountable",
      placeholder: "What happens in the next 48 hours? Who owns it?",
    }),
  );

  container.appendChild(
    modeCSection({
      id: "boundary_statement",
      title: "Boundary Statement / Non‑negotiables",
      helper: "Must tag: Scope + Logistical Constraints",
      placeholder: "What will not be compromised? Where is the boundary under pressure?",
    }),
  );

  container.appendChild(
    modeCSection({
      id: "lifecycle_impact",
      title: "Lifecycle / Whole-of-life Impact",
      helper: "Must tag: KPIs and/or As-is State",
      placeholder: "What invisible system costs or consequences might emerge later?",
    }),
  );

  container.appendChild(
    modeCSection({
      id: "stakeholder_message",
      title: "Stakeholder Message",
      helper: "Must tag: Internal/External Stakeholder Context + Team Governance",
      placeholder: "What message aligns stakeholders without hiding reality?",
    }),
  );

  return container;
}

function modeCSection({ id, title, helper, placeholder }) {
  const sec = document.createElement("div");
  sec.className = "grid";

  const label = document.createElement("label");
  label.textContent = `${title} — ${helper}`;
  sec.appendChild(label);

  const ta = document.createElement("textarea");
  ta.placeholder = placeholder;
  ta.value = state.round.textBySection[id] || "";
  ta.addEventListener("input", () => {
    state.round.textBySection[id] = ta.value;
  });
  sec.appendChild(ta);

  const chips = createChipset({
    selected: new Set(state.round.tagsBySection[id] || []),
    onToggle: (tagId, isSelected) => {
      const next = new Set(state.round.tagsBySection[id] || []);
      if (isSelected) next.add(tagId);
      else next.delete(tagId);
      state.round.tagsBySection[id] = Array.from(next);
    },
  });
  sec.appendChild(chips);

  return sec;
}

function createChipset({ selected, onToggle }) {
  const container = document.createElement("div");
  container.className = "chipset";
  for (const f of SHARED_MODEL_FIELDS) {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.dataset.selected = selected.has(f.id) ? "true" : "false";
    chip.setAttribute("role", "button");
    chip.setAttribute("tabindex", "0");
    chip.setAttribute("aria-pressed", selected.has(f.id) ? "true" : "false");
    chip.innerHTML = `<span class="chip__mini" style="background:${chipColor(f.id)}"></span>${f.label}`;
    const toggle = () => {
      const nextSelected = chip.dataset.selected !== "true";
      chip.dataset.selected = nextSelected ? "true" : "false";
      chip.setAttribute("aria-pressed", nextSelected ? "true" : "false");
      onToggle(f.id, nextSelected);
    };
    chip.addEventListener("click", toggle);
    chip.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
    container.appendChild(chip);
  }
  return container;
}

function selectMode(mode) {
  state.round.mode = mode;
  renderModeForm();
  state.ui.update();
}

function submitRound() {
  if (!state.round?.mode) {
    openModal({
      title: "Pick a mode first",
      body: "Mode choice is part of the training. Choose A, B, or C.",
      buttons: [{ label: "OK", variant: "btn--primary", onClick: closeModal }],
    });
    return;
  }

  const scene = state.round.scene;
  const stakeholders = scene.stakeholders.map(stakeholderById).filter(Boolean);
  const requiredTags = Array.from(state.round.requiredTags);

  const { deltas, notes, triggers, tagCoverage, allTags } = computeRoundDeltas({
    mode: state.round.mode,
    timedOut: state.round.timedOut,
    textBySection: state.round.textBySection,
    tagsBySection: state.round.tagsBySection,
    stakeholders,
    modeACountTotal: state.tacticalCount,
    persistentMods: state.persistentMods,
    requiredTags,
  });

  const unmetReq = requiredTags.filter((t) => !new Set(allTags).has(t));
  const modeCValidation =
    state.round.mode === MODES.C
      ? validateModeCResponse({ textBySection: state.round.textBySection, tagsBySection: state.round.tagsBySection })
      : null;

  state.meters = applyDeltas(state.meters, deltas);
  if (state.round.mode === MODES.A) state.tacticalCount += 1;

  for (const tagId of allTags) {
    if (state.tagsUsedCounts[tagId] !== undefined) state.tagsUsedCounts[tagId] += 1;
  }

  if (state.round.mode === MODES.C) {
    const hasVision = (state.round.tagsBySection?.purpose_anchor || []).includes("vision");
    if (!hasVision) state.driftTimeline.push({ round: state.roundIndex + 1, when: "Purpose Anchor", note: "Vision dropped." });
  }

  let consequence = null;
  for (const trig of triggers) {
    if (trig === "rework_cascade") {
      consequence = CONSEQUENCES.rework_cascade;
      state.persistentMods = { ...(state.persistentMods || {}), ...(consequence.persistent || {}) };
      state.lastConsequence = consequence;
      state.meters = applyDeltas(state.meters, consequence.effects);
    }
  }

  // Round summary snapshot
  state.lastRoundSummary = {
    round: state.roundIndex + 1,
    sceneTitle: scene.title,
    mode: state.round.mode,
    tagCoverage,
    requiredTags,
    unmetReq,
    deltas,
    notes,
    consequence: consequence ? consequence.id : null,
    metersAfter: { ...state.meters },
    modeCValidation,
  };

  // End conditions
  const failed =
    state.meters.sharedModelStability <= 0 || state.meters.systemHealth <= 0 || state.meters.burnRate >= 100;

  state.round = null;
  if (failed) {
    setScreen("end");
    return;
  }

  setScreen("debrief");
}

function renderDebrief() {
  const s = state.lastRoundSummary;
  const wrap = document.createElement("div");
  wrap.className = "card";

  const title = document.createElement("h2");
  title.className = "card__title";
  title.textContent = "Debrief";
  wrap.appendChild(title);

  const desc = document.createElement("div");
  desc.className = "card__desc";
  desc.textContent = `${s.sceneTitle} • ${MODE_LABEL[s.mode]} • Tag coverage: ${s.tagCoverage}`;
  wrap.appendChild(desc);

  const divider = document.createElement("div");
  divider.className = "divider";
  wrap.appendChild(divider);

  const metrics = document.createElement("div");
  metrics.className = "grid";
  metrics.appendChild(
    metricLine(
      "Meters",
      `Stability ${s.metersAfter.sharedModelStability} • Vision ${s.metersAfter.visionIntegrity} • Confidence ${s.metersAfter.stakeholderConfidence} • Health ${s.metersAfter.systemHealth} • Burn ${s.metersAfter.burnRate}`,
    ),
  );
  if (s.requiredTags.length) {
    metrics.appendChild(
      metricLine(
        "Interrupt requirements",
        s.unmetReq.length
          ? `Unmet: ${s.unmetReq.map((id) => fieldById(id)?.label || id).join(", ")}`
          : "All met.",
      ),
    );
  }
  if (s.consequence) {
    const c = CONSEQUENCES[s.consequence] || state.lastConsequence;
    if (c) metrics.appendChild(metricLine("Consequence", c.title));
  }
  wrap.appendChild(metrics);

  if (s.modeCValidation && !s.modeCValidation.ok) {
    const warn = document.createElement("div");
    warn.className = "card__desc";
    const items = [
      ...s.modeCValidation.missingText.map((x) => `Missing text: ${x}`),
      ...s.modeCValidation.missingTags.map((x) => `Missing tags: ${x}`),
      ...s.modeCValidation.violations.map((v) => v.message),
    ];
    warn.textContent = `Mode C was incomplete: ${items.slice(0, 4).join(" • ")}${items.length > 4 ? " • …" : ""}`;
    wrap.appendChild(document.createElement("div")).className = "divider";
    wrap.appendChild(warn);
  }

  const divider2 = document.createElement("div");
  divider2.className = "divider";
  wrap.appendChild(divider2);

  const actions = document.createElement("div");
  actions.className = "row";

  const openCanvas = document.createElement("button");
  openCanvas.type = "button";
  openCanvas.className = "btn btn--ghost";
  openCanvas.textContent = "Shared Model Canvas";
  openCanvas.addEventListener("click", () => showSharedModelCanvasModal());
  actions.appendChild(openCanvas);

  const next = document.createElement("button");
  next.type = "button";
  next.className = "btn btn--primary";
  next.textContent = state.roundIndex + 1 >= SCENES.length ? "Final Debrief" : "Next Round";
  next.addEventListener("click", () => {
    state.roundIndex += 1;
    if (state.roundIndex >= SCENES.length) setScreen("end");
    else setScreen("briefing");
  });
  actions.appendChild(next);

  wrap.appendChild(actions);
  screenRoot.appendChild(wrap);
  state.ui.update = () => {};
}

function renderEnd() {
  const wrap = document.createElement("div");
  wrap.className = "card";

  const title = document.createElement("h2");
  title.className = "card__title";
  title.textContent = "Meta‑Debrief";
  wrap.appendChild(title);

  const desc = document.createElement("div");
  desc.className = "card__desc";
  desc.textContent =
    "Transfer happens here: compare what you said vs what the shared model required. Then refine the game design.";
  wrap.appendChild(desc);

  const divider = document.createElement("div");
  divider.className = "divider";
  wrap.appendChild(divider);

  const meters = document.createElement("div");
  meters.className = "card__desc";
  meters.textContent = `Final meters — Stability ${state.meters.sharedModelStability} • Vision ${state.meters.visionIntegrity} • Confidence ${state.meters.stakeholderConfidence} • Health ${state.meters.systemHealth} • Burn ${state.meters.burnRate}`;
  wrap.appendChild(meters);

  const divider2 = document.createElement("div");
  divider2.className = "divider";
  wrap.appendChild(divider2);

  const heatTitle = document.createElement("div");
  heatTitle.className = "card__desc";
  heatTitle.textContent = "Shared Model field usage heatmap (higher = better):";
  wrap.appendChild(heatTitle);

  const heat = document.createElement("div");
  heat.className = "chipset";
  const maxCount = Math.max(1, ...Object.values(state.tagsUsedCounts));
  for (const f of SHARED_MODEL_FIELDS) {
    const count = state.tagsUsedCounts[f.id] || 0;
    const intensity = count / maxCount;
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.dataset.selected = "true";
    chip.style.background = `rgba(29, 226, 198, ${0.08 + 0.26 * intensity})`;
    chip.style.outlineColor = `rgba(29, 226, 198, ${0.22 + 0.4 * intensity})`;
    chip.innerHTML = `<span class="chip__mini" style="background:${chipColor(f.id)}"></span>${f.label} <span style="opacity:.75">(${count})</span>`;
    heat.appendChild(chip);
  }
  wrap.appendChild(heat);

  if (state.driftTimeline.length) {
    const divider3 = document.createElement("div");
    divider3.className = "divider";
    wrap.appendChild(divider3);

    const drift = document.createElement("div");
    drift.className = "card__desc";
    drift.textContent = "Drift timeline:";
    wrap.appendChild(drift);

    const list = document.createElement("div");
    list.className = "grid";
    for (const d of state.driftTimeline.slice(0, 6)) {
      list.appendChild(metricLine(`Round ${d.round}`, `${d.when}: ${d.note}`));
    }
    wrap.appendChild(list);
  }

  const divider4 = document.createElement("div");
  divider4.className = "divider";
  wrap.appendChild(divider4);

  const actions = document.createElement("div");
  actions.className = "row";

  const restart = document.createElement("button");
  restart.type = "button";
  restart.className = "btn btn--primary";
  restart.textContent = "Play Again";
  restart.addEventListener("click", resetAll);
  actions.appendChild(restart);

  const openCanvas = document.createElement("button");
  openCanvas.type = "button";
  openCanvas.className = "btn btn--ghost";
  openCanvas.textContent = "Shared Model Canvas";
  openCanvas.addEventListener("click", () => showSharedModelCanvasModal());
  actions.appendChild(openCanvas);

  wrap.appendChild(actions);
  screenRoot.appendChild(wrap);
  state.ui.update = () => {};
}

// ---------- Shared Model Canvas Modal ----------
function showSharedModelCanvasModal() {
  const body = document.createElement("div");
  body.className = "grid";

  const img = document.createElement("img");
  img.className = "hero-img";
  img.alt = "Cohort 9 Shared Model template graphic";
  img.src = "./assets/cohort9_shared_model_template.svg";
  body.appendChild(img);

  const intro = document.createElement("div");
  intro.textContent =
    "This is the only authoritative source. If a response doesn’t reference a model element (via tags), it doesn’t count.";
  body.appendChild(intro);

  const cards = document.createElement("div");
  cards.className = "grid";
  for (const f of SHARED_MODEL_FIELDS) {
    const line = document.createElement("div");
    line.className = "card__desc";
    const value = SHARED_MODEL_CANVAS[f.id] || "(not set)";
    line.innerHTML = `<span style="font-weight:850;color:rgba(255,255,255,.92)">${f.label}:</span> ${escapeHtml(
      value,
    )}`;
    cards.appendChild(line);
  }
  body.appendChild(cards);

  openModal({
    title: "Shared Model Canvas (Reference)",
    body,
    buttons: [{ label: "Got it", variant: "btn--primary", onClick: closeModal }],
  });
}

function showHelpModal() {
  const body = document.createElement("div");
  body.className = "grid";

  const top = document.createElement("div");
  top.innerHTML =
    "<strong>Quick start</strong><ol class='steps'>" +
    "<li><strong>Start</strong> a round.</li>" +
    "<li>Pick a mode (A/B/C).</li>" +
    "<li>Write + tag your response sections.</li>" +
    "<li>Meet any required tags from interrupts.</li>" +
    "<li>Submit and read the debrief.</li>" +
    "</ol>";
  body.appendChild(top);

  const controls = document.createElement("div");
  controls.className = "callout";
  controls.innerHTML =
    "<strong>Controls</strong><div class='card__desc' style='margin-top:6px'>" +
    "1/2/3 = Mode A/B/C • Enter = Submit • F = Fullscreen • Esc = Close popups • ? = Help" +
    "</div>";
  body.appendChild(controls);

  openModal({
    title: "Help",
    body,
    buttons: [{ label: "Close", variant: "btn--primary", onClick: closeModal }],
  });
}

// ---------- Loop / Timing ----------
let rafId = null;
let lastTs = null;

function startLoop() {
  stopLoop();
  lastTs = null;
  const tick = (ts) => {
    if (lastTs == null) lastTs = ts;
    const dt = clamp(ts - lastTs, 0, 80);
    lastTs = ts;
    step(dt);
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}

function stopLoop() {
  if (rafId != null) cancelAnimationFrame(rafId);
  rafId = null;
}

function step(dtMs) {
  if (state.screen === "round" && state.round) {
    const diff = DIFFICULTY[state.difficulty] || DIFFICULTY.standard;

    const shouldPauseForInjection = diff.injectionPauses && state.round.pausedForInjection;
    if (!shouldPauseForInjection) {
      state.round.secondsLeft = clamp(state.round.secondsLeft - dtMs / 1000, 0, state.round.secondsTotal);
    }

    maybeTriggerInjection();

    if (state.round.secondsLeft <= 0 && !state.round.timedOut) {
      state.round.timedOut = true;
      // Auto-submit on timeout.
      submitRound();
      return;
    }
  }

  state.ui.update?.();
  renderCanvas();
}

function maybeTriggerInjection() {
  const r = state.round;
  if (!r) return;
  const diff = DIFFICULTY[state.difficulty] || DIFFICULTY.standard;

  const secondsPassed = r.secondsTotal - r.secondsLeft;
  const injections = [...r.scene.injections];

  // Persistent mod: add one extra injection late in the round (rework chaos).
  if (state.persistentMods?.injectionExtra) {
    injections.push({
      at_s: Math.min(r.secondsTotal - 12, 102),
      from: pick(r.scene.stakeholders, state.roundIndex + 2),
      line: "Rework shock: an integration defect cascades across interfaces. Stakeholders are fragmenting.",
      extra: true,
    });
    injections.sort((a, b) => a.at_s - b.at_s);
  }

  if (r.injectionIndex >= injections.length) return;
  const next = injections[r.injectionIndex];
  if (secondsPassed + 1e-6 < next.at_s) return;

  r.injectionIndex += 1;
  const st = stakeholderById(next.from);
  r.activeInjection = {
    ...next,
    fromStakeholder: st,
    requiredTag: recommendedRequiredTagForStakeholder(st),
  };

  if (r.activeInjection.requiredTag) r.requiredTags.add(r.activeInjection.requiredTag);

  r.pausedForInjection = diff.injectionPauses;

  const tagLabel = r.activeInjection.requiredTag ? fieldById(r.activeInjection.requiredTag)?.label : null;
  const body = document.createElement("div");
  body.className = "grid";

  const line = document.createElement("div");
  line.textContent = next.line;
  body.appendChild(line);

  if (st) {
    const meta = document.createElement("div");
    meta.innerHTML = `<span style="font-weight:850;color:rgba(255,255,255,.92)">${st.role}</span> (DiSC ${st.disc}) — ${escapeHtml(
      st.bio,
    )}`;
    body.appendChild(meta);
  }

  if (tagLabel) {
    const req = document.createElement("div");
    req.innerHTML = `<span style="font-weight:850;color:rgba(255,255,255,.92)">New requirement:</span> include the <span style="font-weight:850">${escapeHtml(
      tagLabel,
    )}</span> tag somewhere before you submit.`;
    body.appendChild(req);
  }

  openModal({
    title: "Stakeholder Interrupt",
    body,
    buttons: [
      {
        label: diff.injectionPauses ? "Continue (timer paused)" : "Continue (timer running)",
        variant: "btn--primary",
        onClick: () => {
          r.pausedForInjection = false;
          r.activeInjection = null;
          closeModal();
        },
      },
    ],
  });
}

function recommendedRequiredTagForStakeholder(stakeholder) {
  if (!stakeholder) return null;
  switch (stakeholder.disc) {
    case "D":
      return "responsible";
    case "i":
      return "vision";
    case "S":
      return "team_governance";
    case "C":
      return "kpis";
    default:
      return null;
  }
}

// ---------- Canvas render ----------
function renderCanvas() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Background frame
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "rgba(255, 176, 32, 0.085)");
  g.addColorStop(1, "rgba(29, 226, 198, 0.085)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Header
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "900 26px Fraunces";
  ctx.fillText("Shared Model Under Pressure", 28, 44);

  // Meters
  const meters = state.meters;
  const meterY = 76;
  const meterX = 28;
  const meterW = w - 56;
  drawMeterRow(meterX, meterY, meterW, meters);
  const metersHeight = 5 * 14 + 4 * 12;
  const statusBaseY = meterY + metersHeight + 30;

  // Vision Jenga / Coherence Tower
  drawCoherenceTower(w - 240, 240, 190, 400, meters.sharedModelStability);

  // Status strip (avoid overlapping the bars)
  ctx.font = "650 13px Instrument Sans";
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  const status =
    state.screen === "round" ? "LIVE" : state.screen === "debrief" ? "DEBRIEF" : state.screen === "end" ? "META" : "READY";
  ctx.fillText(`Status: ${status}`, 28, statusBaseY);

  const hint =
    state.screen === "round"
      ? "Pressure is scripted. The drift is real. Tag your thinking to the model."
      : "Start when ready. Use Fullscreen (F) for presence.";
  stageHint.textContent = hint;

  if (state.screen === "round" && state.round) {
    const sceneLabel = state.round.scene.title;
    ctx.fillText(`Scene: ${sceneLabel}`, 28, statusBaseY + 24);
    ctx.fillText(`Time: ${formatTimer(state.round.secondsLeft)} remaining`, 28, statusBaseY + 46);

    const reqTags = Array.from(state.round.requiredTags);
    if (reqTags.length) {
      ctx.fillStyle = "rgba(255, 77, 109, 0.85)";
      ctx.fillText(
        `Required tags: ${reqTags.map((t) => fieldById(t)?.label || t).join(" • ")}`,
        28,
        statusBaseY + 70,
      );
    }
  }

  if (state.screen === "debrief" && state.lastRoundSummary) {
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.fillText(`Last mode: ${MODE_LABEL[state.lastRoundSummary.mode]}`, 28, statusBaseY + 24);
    ctx.fillText(
      `Tag coverage: ${state.lastRoundSummary.tagCoverage} • Tactical patches so far: ${state.tacticalCount}`,
      28,
      statusBaseY + 46,
    );
  }
}

function drawMeterRow(x, y, w, meters) {
  const items = [
    ["Shared Model Stability", meters.sharedModelStability, "rgba(29, 226, 198, 0.95)"],
    ["Vision Integrity", meters.visionIntegrity, "rgba(255, 176, 32, 0.98)"],
    ["Stakeholder Confidence", meters.stakeholderConfidence, "rgba(255, 107, 53, 0.95)"],
    ["System Health", meters.systemHealth, "rgba(198, 255, 58, 0.9)"],
    ["Burn Rate", meters.burnRate, "rgba(255, 77, 109, 0.9)"],
  ];

  const rowH = 14;
  const gap = 12;
  let cy = y;

  ctx.font = "700 12px Instrument Sans";
  for (const [label, val, color] of items) {
    const barH = rowH;
    const barW = w;
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    roundRect(ctx, x, cy, barW, barH, 9);
    ctx.fill();

    ctx.fillStyle = color;
    roundRect(ctx, x, cy, (barW * clamp(val, 0, 100)) / 100, barH, 9);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fillText(`${label} — ${val}`, x + 10, cy + 11);

    cy += barH + gap;
  }
}

function drawCoherenceTower(x, y, w, h, stability) {
  const blocks = 10;
  const remaining = Math.max(0, Math.round((blocks * stability) / 100));
  const blockH = Math.floor(h / blocks) - 6;
  const blockW = w - 18;

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "900 18px Fraunces";
  ctx.fillText("Strategic Coherence", 0, -14);

  for (let i = 0; i < blocks; i++) {
    const yy = h - (i + 1) * (blockH + 6);
    const alive = i < remaining;
    const jitter = alive ? 0 : 0;
    ctx.fillStyle = alive ? "rgba(255, 243, 215, 0.92)" : "rgba(255, 243, 215, 0.16)";
    ctx.strokeStyle = alive ? "rgba(11, 15, 20, 0.85)" : "rgba(255,255,255,0.10)";
    ctx.lineWidth = 2;
    roundRect(ctx, 0 + jitter, yy, blockW, blockH, 12);
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = "650 12px Instrument Sans";
  ctx.fillText(`Blocks remaining: ${remaining}/${blocks}`, 0, h + 18);
  ctx.restore();
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}

// ---------- Helpers ----------
function pill(k, v, dotColor) {
  const el = document.createElement("div");
  el.className = "pill";
  el.innerHTML = `<span class="pill__dot" style="background:${dotColor}"></span><span style="opacity:.85">${escapeHtml(
    k,
  )}:</span> <span class="pill__value" style="opacity:.95">${escapeHtml(v)}</span>`;
  return el;
}

function metricLine(k, v) {
  const el = document.createElement("div");
  el.className = "card__desc";
  el.innerHTML = `<span style="font-weight:850;color:rgba(255,255,255,.92)">${escapeHtml(
    k,
  )}:</span> ${escapeHtml(v)}`;
  return el;
}

function modeButton(kbd, label, variant, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = `btn ${variant}`;
  b.innerHTML = `<span style="opacity:.85">[${escapeHtml(kbd)}]</span> ${escapeHtml(label)}`;
  b.addEventListener("click", onClick);
  return b;
}

function formatTimer(seconds) {
  const s = Math.ceil(seconds);
  const mm = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function chipColor(fieldId) {
  const palette = [
    "var(--amber)",
    "var(--teal)",
    "var(--tangerine)",
    "var(--lime)",
    "var(--rose)",
  ];
  const idx = SHARED_MODEL_FIELDS.findIndex((f) => f.id === fieldId);
  return palette[Math.max(0, idx) % palette.length];
}

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (state.screen !== "round" || !state.round) return;

  if (e.key === "1") selectMode(MODES.A);
  if (e.key === "2") selectMode(MODES.B);
  if (e.key === "3") selectMode(MODES.C);
  if (e.key === "Enter") submitRound();
});

// ---------- Required globals for test harness ----------
function renderGameToText() {
  const payload = {
    note:
      "No world-coordinate gameplay; canvas is informational. Interactions happen via DOM buttons/fields.",
    screen: state.screen,
    difficulty: state.difficulty,
    smoke: SMOKE,
    roundIndex: state.roundIndex,
    meters: { ...state.meters },
    tacticalCount: state.tacticalCount,
    lastConsequence: state.lastConsequence ? state.lastConsequence.id : null,
    round:
      state.round && state.screen === "round"
        ? {
            sceneId: state.round.scene.id,
            secondsLeft: Number(state.round.secondsLeft.toFixed(3)),
            secondsTotal: state.round.secondsTotal,
            mode: state.round.mode,
            requiredTags: Array.from(state.round.requiredTags),
          }
        : null,
  };
  return JSON.stringify(payload);
}

window.render_game_to_text = renderGameToText;

window.advanceTime = (ms) => {
  const stepMs = 1000 / 60;
  const n = Math.max(1, Math.round(ms / stepMs));
  for (let i = 0; i < n; i++) step(stepMs);
  renderCanvas();
};

// Boot
resetAll();
startLoop();
