---
domain: systems-engineering
---
# Shared Model Under Pressure (INCOSE TLI Cohort 10)

A public, dependency-free browser game (static HTML/CSS/JS) designed to train **Shared Model** usage under delivery pressure.

## 🎮 What's New in Cohort 10

### Visual & UX Enhancements
- **Modern Dark OLED Luxury Design**: Contemporary visual design with refined amber/teal color palette
- **Responsive Layout**: Works seamlessly across desktop, laptop, tablet, and mobile devices
- **Full-Screen Mode**: Enhanced gameplay with F or F11 key shortcuts
- **Separated References**: Canvas (visual diagram) and Glossary (field definitions) now in separate modals
- **Previous Round Indicators**: Light markers on meters show previous round values for comparison

### Gameplay Improvements
- **Training Mode**: 5-step progressive tutorial for new players
- **Random Interrupt Timing**: Interrupts now occur at randomized times (±10s windows) for increased replayability
- **Pre-Selected Tags**: Interrupts suggest relevant tags based on stakeholder DiSC type
- **Pop-Up Responses**: Compact interrupt pop-ups instead of full modals
- **Health Bar Redesign**: Clear strategic coherence visualization with color zones
- **Expert Difficulty**: New "Expert – Chaos" mode (90s timer, extra interrupts, no pauses)

### Content Enhancements
- **Rich Stakeholder Backgrounds**: Detailed professional backgrounds, motivations, and system roles
- **Enhanced Debrief**: Shows user-entered text with tag feedback
- **Specific Success Criteria**: Measurable KPIs with baseline and target values

## 🚀 Run Locally

```bash
cd "01-Projects/incose-tli-shared-model-game/site"
python3 -m http.server 5173
```

Then open `http://localhost:5173`.

## 🎯 How to Play

### Quick Start
1. Click **Start** or **Training Mode** (recommended for first-time players)
2. Choose difficulty: Training (150s), Standard (120s), Hardcore (105s), or Expert (90s)
3. Select response mode: A (tactical), B (strategic pause), or C (model reframe)
4. Write responses and tag them to Shared Model fields
5. Handle stakeholder interrupts by including required tags
6. Review debrief for feedback and meter changes

### Response Modes
- **Mode A - Tactical Patch**: Quick response, lower score, tactical drift risk
- **Mode B - Strategic Pause**: Balanced approach, moderate score
- **Mode C - Model Reframe**: Comprehensive response, highest score, requires all sections

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `1` / `2` / `3` | Select Mode A / B / C |
| `Enter` | Submit response |
| `F` / `F11` | Toggle full-screen |
| `Esc` | Close modals |
| `Alt+C` | Open Canvas reference |
| `Alt+G` | Open Glossary |
| `?` | Help |

## 🎓 Training Mode

New players should start with Training Mode, which provides:
1. **Understanding the Shared Model Canvas**: Overview of key fields
2. **Selecting Response Modes**: Learn when to use A, B, or C
3. **Tagging Responses**: Practice connecting responses to model fields
4. **Handling Interrupts**: Experience stakeholder pressure
5. **Reading Debrief**: Understand feedback and metrics

Training completion is saved locally and won't auto-launch on subsequent visits.

## 📊 Game Mechanics

### Meters
- **Shared Model Stability**: Overall model coherence (0-100)
- **Vision Integrity**: Alignment with long-term purpose (0-100)
- **Stakeholder Confidence**: Trust and buy-in (0-100)
- **System Health**: Technical and operational health (0-100)
- **Burn Rate**: Resource consumption rate (0-100, lower is better)

### Stakeholders
Four stakeholder personas with DiSC profiles:
- **Morgan (D)**: Operations Lead - Values action, accountability, strategy
- **Ravi (i)**: Public Trust & Comms - Values vision, narrative, stakeholder alignment
- **Aisha (S)**: Safety & Training - Values team governance, safety, alignment
- **Elena (C)**: Finance & Compliance - Values KPIs, constraints, lifecycle impact

### Consequences
- **Rework Cascade**: Triggers after 3 Mode A selections - cascading defects, stakeholder fragmentation

## 🌐 Deploy to GitHub Pages

Simplest:
- Create a new repo (e.g. `incose-tli-shared-model-game`).
- Copy **the contents of** `site/` into the repo root.
- In GitHub → Settings → Pages → Source: "Deploy from a branch" → Branch: `main` → Folder: `/ (root)`.

Alternative:
- Keep the site in a `/docs` folder and publish `/docs`.

## 🧪 Testing

### Automated Tests
```bash
# Run unit tests
node --test tests/

# Run smoke test with autoplay
open http://localhost:5173?smoke=1

# Run training mode test
open http://localhost:5173?training=1
```

### Manual Testing Checklist
- [ ] All difficulty levels selectable and functional
- [ ] Training mode completes successfully
- [ ] Interrupts trigger at randomized times
- [ ] Pre-selected tags appear in interrupts
- [ ] Full-screen mode works with F and F11
- [ ] Canvas and Glossary modals open separately
- [ ] Previous round indicators show on meters
- [ ] Debrief displays user responses with feedback
- [ ] Responsive layout works on mobile/tablet/desktop

## 🎨 Design System

### Color Palette
- **Primary Amber**: `#ffb700` - Actions, highlights
- **Primary Teal**: `#00d4aa` - Success, selected states
- **Danger Rose**: `#ff4d6d` - Warnings, critical states
- **Background**: `#000000` to `#0a0a0f` - OLED-optimized dark theme

### Typography
- **Display**: Fraunces (serif) - Headlines, titles
- **Body**: Instrument Sans - UI text, descriptions

## 📝 What the Game Trains

- Responding under time pressure while explicitly anchoring to Shared Model fields (tags)
- Avoiding "tactical drift" via cumulative consequences (e.g., **Rework Cascade** after 3 tactical patches)
- Managing stakeholder pressure with a light **DiSC** flavor layer (stakeholder personas reward different model elements)
- Building shared model discipline through practice and feedback
- Understanding the connection between tactical decisions and strategic coherence

## 🔧 Technical Details

- **No dependencies**: Pure HTML/CSS/JavaScript
- **No build step**: Served directly as static files
- **No backend**: All game logic runs client-side
- **Accessible**: Keyboard navigation, ARIA labels, semantic HTML
- **Performance**: <2s load time, 60fps animations

## 📄 License

Created for INCOSE TLI Cohort 10. Educational use.

---

**Live Demo**: Coming soon to GitHub Pages
**Questions**: Contact INCOSE TLI Cohort 10 team
