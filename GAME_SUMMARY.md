# Shared Model Under Pressure - Game Summary

## 🎮 Overview

**Shared Model Under Pressure** is a serious training game designed by INCOSE TLI Cohort 10 to teach systems engineers how to maintain strategic coherence while responding to stakeholder pressure under time constraints. The game simulates the challenges of emergency drone response system development, where tactical decisions must be explicitly anchored to a shared mental model.

## 🎯 Learning Objectives

### Primary Goals
- **Maintain Strategic Coherence**: Practice linking tactical responses to strategic model elements
- **Manage Stakeholder Pressure**: Handle competing demands from diverse stakeholder perspectives
- **Avoid Tactical Drift**: Resist the temptation to patch symptoms without addressing root causes
- **Build Shared Model Discipline**: Develop muscle memory for explicit model-based decision making

### Secondary Benefits
- Understand DiSC personality types in stakeholder management
- Experience consequences of rework cascade from accumulated tactical debt
- Practice clear communication under time pressure
- Learn to balance speed vs. thoroughness in crisis situations

## 🎨 Design Philosophy

### Visual Aesthetic: Dark OLED Luxury
The game employs a sophisticated **Dark OLED Luxury** design language:
- **Pure Black Background** (#000000) optimized for OLED displays
- **Amber Warmth** (#ffb700) representing action, urgency, and tactical energy
- **Teal Clarity** (#00d4aa) symbolizing strategic thinking and system health
- **Rose Danger** (#ff3366) warning of critical situations and rework cascades
- **Subtle Gradients**: Mesh-like background effects creating depth without distraction

### Typography
- **Display**: Fraunces (serif) - Headlines, titles, moments of gravitas
- **Body**: Instrument Sans - Clean, readable UI text with professional character

### Interaction Design
- **Smooth Transitions**: 150-400ms cubic-bezier easing for natural motion
- **Purposeful Feedback**: Every interaction provides clear visual response
- **Keyboard First**: Full keyboard navigation with intuitive shortcuts
- **Accessibility**: WCAG AA contrast ratios, ARIA labels, semantic HTML

## 🎮 Core Mechanics

### Game Flow
1. **Setup Phase**: Select difficulty (Training/Standard/Hardcore/Expert)
2. **Briefing**: Review scenario context and success criteria
3. **Action Phase**: Respond to events within time limit
4. **Interrupts**: Handle stakeholder demands (randomized timing)
5. **Debrief**: Review performance, tag coverage, meter changes
6. **Repeat**: Continue for 3-5 rounds based on scenario

### Response Modes
Players choose from three response strategies:

#### Mode A - Tactical Patch (Quick)
- **Speed**: Fastest response (minimal time cost)
- **Impact**: Lower score, risks tactical drift
- **Use Case**: Immediate containment, buying time
- **Consequence**: 3+ Mode A selections trigger Rework Cascade

#### Mode B - Strategic Pause (Balanced)
- **Speed**: Moderate time cost
- **Impact**: Good score, maintains coherence
- **Use Case**: Standard operational decisions
- **Consequence**: Sustainable for most situations

#### Mode C - Model Reframe (Comprehensive)
- **Speed**: Highest time cost
- **Impact**: Maximum score, strengthens model
- **Use Case**: Critical decisions, complex situations
- **Requirement**: Must tag all major model sections

### Tagging System
Every response must be tagged to Shared Model elements:
- **Purpose Anchor**: Vision, Rationale, Problem
- **Strategic Core**: Strategy, Scope, KPIs
- **Execution**: As-Is State, Logistical Constraints
- **Stakeholders**: Internal, External, Team Governance
- **Learning**: Resources/Knowledge, Tools/Processes

**Pre-Selected Tags**: Interrupts suggest 2-3 relevant tags based on stakeholder DiSC type, but players can modify selections.

### Meter System
Five real-time metrics track system health:

1. **Shared Model Stability** (0-100)
   - Overall coherence of the mental model
   - Drops from poor tagging, rises from Mode C responses
   - Critical threshold: <25 triggers warnings

2. **Vision Integrity** (0-100)
   - Alignment with long-term purpose
   - Affected by ignoring vision-related tags
   - Recovers slowly, drops quickly

3. **Stakeholder Confidence** (0-100)
   - Trust and buy-in from all parties
   - Impacted by stakeholder-specific responses
   - Different stakeholders value different model elements

4. **System Health** (0-100)
   - Technical and operational wellness
   - Affected by cutting corners, skipping constraints
   - Critical for long-term sustainability

5. **Burn Rate** (0-100, lower is better)
   - Resource consumption velocity
   - Increases with Mode A responses
   - High burn rate accelerates meter degradation

### Strategic Coherence Health Bar
Visual representation of overall game state:
- **10 Segments**: Clear progression from 0 to 100
- **Color Zones**:
  - 🔴 **Critical** (0-25): Immediate intervention needed
  - 🟠 **Low** (25-50): Caution, recovery required
  - 🟡 **Medium** (50-75): Stable but vigilance needed
  - 🟢 **High** (75-100): Thriving, excellent coherence
- **Previous Round Indicators**: Light markers show where meters were last round

## 👥 Stakeholder Personas

### Morgan (D - Dominance)
**Role**: Operations Lead
**Background**: 15-year veteran of emergency response operations. Led rural dispatch modernization across 3 states. Known for decisive action under pressure.
**Motivations**: Saving lives through faster response times. Frustrated by bureaucratic delays. Values clear accountability and measurable outcomes.
**Recommended Tags**: Responsible, Strategy, Accountable
**Communication Style**: Direct, action-oriented, results-focused

### Ravi (i - Influence)
**Role**: Public Trust & Communications
**Background**: Former investigative journalist turned public affairs specialist. Expert in crisis communications and narrative management.
**Motivations**: Maintaining public confidence. Preventing misinformation. Building bridges between technical teams and community.
**Recommended Tags**: Vision, Rationale, External Stakeholders
**Communication Style**: Enthusiastic, narrative-driven, relationship-focused

### Aisha (S - Steadiness)
**Role**: Safety & Training Lead
**Background**: Career firefighter with paramedic certification. Developed safety protocols adopted statewide. Patient mentor to new responders.
**Motivations**: Zero preventable injuries. Team cohesion and psychological safety. Thorough preparation and training.
**Recommended Tags**: Team Governance, Internal Stakeholders, Scope
**Communication Style**: Supportive, methodical, consensus-building

### Elena (C - Conscientiousness)
**Role**: Finance & Compliance Officer
**Background**: CPA with aerospace industry background. Managed budgets for federal grant programs. Detail-oriented and data-driven.
**Motivations**: Fiscal responsibility. Regulatory compliance. Long-term sustainability and lifecycle cost management.
**Recommended Tags**: KPIs, Logistical Constraints, As-Is State
**Communication Style**: Analytical, precise, evidence-based

## 🎯 Difficulty Levels

### Easy – Training (150 seconds)
- **Target**: First-time players, learning mechanics
- **Features**: Paused interrupts, fixed timing, tutorial mode available
- **Goal**: Learn without pressure

### Standard – Standard (120 seconds)
- **Target**: Experienced players, normal gameplay
- **Features**: Paused interrupts, randomized timing
- **Goal**: Balanced challenge

### Difficult – Hardcore (105 seconds)
- **Target**: Skilled players seeking challenge
- **Features**: Unpaused interrupts, faster burn rate
- **Goal**: Test mastery under pressure

### Expert – Chaos (90 seconds) ⚡
- **Target**: Masters seeking ultimate challenge
- **Features**: 
  - No interrupt pauses
  - Extra injection at 70% of round time
  - 1.3x burn rate multiplier
  - Red pulsing button indicator
- **Goal**: Survive maximum chaos

## 🎓 Training Mode

### 5-Step Progressive Tutorial

#### Step 1: Understanding the Shared Model Canvas
**Objective**: Learn the 17-field model structure
**Activity**: Interactive canvas tour highlighting Vision, Strategy, KPIs
**Reward**: +5 to all meters (practice round)

#### Step 2: Selecting Response Modes
**Objective**: Understand A/B/C trade-offs
**Activity**: Guided selection of Mode C with explanation
**Reward**: Understanding of strategic vs. tactical responses

#### Step 3: Tagging Responses Correctly
**Objective**: Connect responses to model fields
**Activity**: Practice tagging with feedback
**Reward**: Tag coverage feedback

#### Step 4: Handling Stakeholder Interrupts
**Objective**: Manage interruptions effectively
**Activity**: Simulated interrupt with pre-selected tags
**Reward**: Experience with pop-up system

#### Step 5: Reading Debrief Feedback
**Objective**: Learn from performance data
**Activity**: Review mock debrief with metrics
**Reward**: "Training Graduate" badge

**Completion**: Saved to localStorage, won't auto-launch again

## 🎪 Game Features

### UI/UX Enhancements (Cohort 10)
- ✅ **Responsive Layout**: Works on mobile, tablet, laptop, desktop
- ✅ **Full-Screen Mode**: F/F11 key toggle with visual indicator
- ✅ **Separated References**: Canvas (visual) and Glossary (definitions) modals
- ✅ **Previous Round Indicators**: Light markers on meter bars
- ✅ **Enhanced Buttons**: Gradient backgrounds, glow effects, smooth transitions
- ✅ **Keyboard Shortcuts**: Alt+C (Canvas), Alt+G (Glossary), F/F11 (Fullscreen), 1/2/3 (Modes)

### Gameplay Improvements
- ✅ **Random Interrupt Timing**: ±10 second windows for unpredictability
- ✅ **Pre-Selected Tags**: Stakeholder-specific tag suggestions
- ✅ **Pop-Up Responses**: Compact interrupt UI (not full modals)
- ✅ **Health Bar Redesign**: Clear visualization with color zones
- ✅ **Enhanced Debrief**: User text display with tag feedback

### Content Enhancements
- ✅ **Rich Stakeholder Backgrounds**: Professional context, motivations, system roles
- ✅ **Specific Success Criteria**: 6 measurable KPIs with baselines and targets
- ✅ **Clarified Field Prompts**: Resources/Knowledge vs Tools/Processes distinction

## 🏆 Scoring System

### Tag Coverage Score
- **Perfect**: All recommended tags selected (100%)
- **Good**: 75-99% coverage
- **Partial**: 50-74% coverage
- **Poor**: Below 50% coverage

### Response Mode Multipliers
- **Mode A**: 0.6x (tactical drift penalty)
- **Mode B**: 1.0x (baseline)
- **Mode C**: 1.4x (comprehensive bonus)

### Difficulty Multipliers
- **Training**: 0.8x (learning bonus)
- **Standard**: 1.0x (baseline)
- **Hardcore**: 1.2x (challenge bonus)
- **Expert**: 1.5x (mastery bonus)

### Final Score Calculation
```
Final Score = (Tag Coverage × Mode Multiplier × Difficulty Multiplier) + Round Bonuses
```

## 🚀 Technical Implementation

### Architecture
- **Pure Static Files**: HTML, CSS, JavaScript only
- **No Dependencies**: Zero npm packages, no build step
- **No Backend**: All logic runs client-side
- **No Framework**: Vanilla JavaScript, no React/Vue/Angular
- **No Bundler**: Direct browser execution

### File Structure
```
site/
├── index.html          # Main HTML structure
├── main.js             # Core game logic
├── styles.css          # Complete visual design
├── assets/
│   └── cohort9_shared_model_template.svg
├── data/
│   ├── scenes.js       # Scenario definitions
│   ├── stakeholders.js # Persona data
│   ├── sharedModel.js  # Model field definitions
│   ├── consequences.js # Rework cascade logic
│   └── training.js     # Tutorial sequences
└── lib/
    ├── scoring.js      # Score calculation
    └── utils.js        # Helper functions
```

### Performance Metrics
- **Load Time**: <2 seconds on broadband
- **First Paint**: <500ms
- **Animation FPS**: 60fps (CSS transitions)
- **File Size**: ~150KB total (uncompressed)
- **Memory Usage**: <50MB during gameplay

### Browser Compatibility
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 📊 Deployment

### GitHub Pages Setup
1. Copy contents of `site/` to repository root
2. Enable GitHub Pages in repository settings
3. Select branch `main` and folder `/ (root)`
4. Access at: `https://[username].github.io/[repo-name]`

### Alternative Deployments
- **Netlify**: Drag-and-drop `site/` folder
- **Vercel**: Connect GitHub repo, auto-deploy
- **Local**: `python3 -m http.server 5173`

### Testing Modes
- **Normal**: Standard gameplay
- **Smoke Test**: `?smoke=1` - Autoplay for CI/CD
- **Training**: `?training=1` - Auto-launch tutorial

## 🎯 Assessment & Feedback

### Formative Feedback (During Gameplay)
- **Meter Changes**: Real-time visual feedback
- **Tag Coverage**: Immediate validation
- **Interrupt Responses**: Pop-up guidance
- **Timer Pressure**: Simulates real-world constraints

### Summative Feedback (End of Round)
- **Debrief Screen**: Comprehensive performance review
- **Tag Analysis**: Coverage percentage, missing tags
- **Meter Summary**: Changes from previous round
- **User Response Display**: What you entered, how you tagged it

### Long-Term Progress
- **Training Badge**: Completion tracking
- **Skill Development**: Pattern recognition over multiple rounds
- **Strategic Thinking**: Improved mode selection over time

## 🔮 Future Enhancements

### Potential Additions
- **Multiplayer Mode**: Collaborative or competitive play
- **Leaderboard**: High scores, fastest completion times
- **Additional Scenarios**: Healthcare, education, finance domains
- **Advanced Analytics**: Heat maps, decision trees, pattern analysis
- **Sound Design**: Ambient audio, sound effects, voice acting
- **Save/Load System**: Persistent game state
- **Mobile Optimization**: Touch-friendly interface
- **Accessibility**: Screen reader support, colorblind modes

### Research Opportunities
- **Learning Effectiveness**: Pre/post assessments
- **Transfer to Practice**: Workplace behavior changes
- **Optimal Difficulty**: Adaptive challenge scaling
- **Cultural Adaptation**: International scenarios

## 📚 Theoretical Foundations

### Shared Mental Models
Based on research showing that teams with aligned mental models:
- Make better decisions under pressure
- Communicate more efficiently
- Recover from errors faster
- Maintain situational awareness

### DiSC Personality Framework
Stakeholder behaviors modeled after DiSC assessment:
- **Dominance**: Results-oriented, direct, firm
- **Influence**: People-oriented, enthusiastic, collaborative
- **Steadiness**: Process-oriented, patient, supportive
- **Conscientiousness**: Quality-oriented, analytical, precise

### Systems Thinking Principles
Game mechanics reflect systems thinking concepts:
- **Interconnectedness**: All model fields relate to each other
- **Feedback Loops**: Meter changes show system responses
- **Delays**: Consequences may not be immediate
- **Unintended Consequences**: Tactical fixes create long-term problems

## 🎓 Educational Use Cases

### Classroom Integration
- **Pre-Lecture Warm-up**: 10-minute gameplay before theory
- **Discussion Catalyst**: Debrief game decisions in class
- **Assessment Tool**: Evaluate understanding of model elements
- **Team Exercise**: Collaborative decision-making

### Professional Development
- **Workshop Activity**: Break the ice with gameplay
- **Reflection Prompt**: Connect game to real projects
- **Coaching Tool**: Identify patterns in decision-making
- **Onboarding**: Train new team members on shared model

## 🏅 Success Metrics

### Individual Level
- **Tag Accuracy**: >80% coverage of recommended tags
- **Mode Selection**: Appropriate mode for situation
- **Meter Management**: Maintain >70 on all meters
- **Completion**: Finish all rounds without rework cascade

### Team Level
- **Shared Vocabulary**: Common language for model elements
- **Faster Alignment**: Reduced time to reach consensus
- **Better Decisions**: More model-anchored proposals
- **Psychological Safety**: Comfortable challenging tactical drift

### Organizational Level
- **Reduced Rework**: Fewer decisions requiring reversal
- **Improved Communication**: Clearer stakeholder updates
- **Strategic Coherence**: Decisions align with vision
- **Learning Culture**: Explicit model-based reflection

## 📞 Support & Contact

### Documentation
- **README.md**: Complete feature list and setup
- **progress.md**: Development history and changelog
- **Help Modal**: In-game keyboard shortcuts and tips

### Community
- **GitHub Issues**: Bug reports, feature requests
- **Discussions**: Strategy sharing, scenario ideas
- **Contributions**: Welcome scenarios, stakeholder personas

---

**Created by**: INCOSE TLI Cohort 10
**License**: Educational use
**Version**: 2.0 (Cohort 10 Enhanced)
**Last Updated**: 2026-03-30

**Play Now**: [GitHub Pages Link]
**Source Code**: [GitHub Repository]
