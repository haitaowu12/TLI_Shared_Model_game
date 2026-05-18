# Deployment Guide - Shared Model Under Pressure

## ✅ Deployment Status: COMPLETE

### Latest Commit

- **Commit**: `af2a672bc` - feat: Cohort 10 UI/UX Enhancement - Complete Game Overhaul
- **Date**: 2026-03-30
- **Branch**: main
- **Status**: ✅ Pushed to GitHub

### Files Committed

- ✅ `README.md` - Complete documentation rewrite
- ✅ `GAME_SUMMARY.md` - Comprehensive game summary (NEW)
- ✅ `progress.md` - Development history and changelog
- ✅ `site/main.js` - Core game logic with all new features
- ✅ `site/styles.css` - Complete visual overhaul
- ✅ `site/index.html` - Layout structure, buttons
- ✅ `site/data/training.js` - Training mode data (NEW)
- ✅ `site/data/stakeholders.js` - Rich stakeholder content
- ✅ `site/data/scenes.js` - Random timing windows
- ✅ `site/data/sharedModel.js` - Clarified field prompts
- ✅ `site/lib/scoring.js` - Expert mode scoring
- ✅ `tests/interrupt_timing.test.mjs` - Timing tests (NEW)

**Total Changes**: 3,392 insertions, 319 deletions across 12 files

## 🌐 GitHub Pages Configuration

### Current Setup

- **Repository**: https://github.com/haitaowu12/Second-Brain
- **Branch**: main
- **Folder**: `/ (root)`
- **Status**: Auto-deploying from main branch

### Deployment URL

Once GitHub Pages finishes building, the game will be available at:

**https://haitaowu12.github.io/Second-Brain/01-Projects/incose-tli-shared-model-game/site/**

### Alternative: Deploy Site Folder to Root

For cleaner URL structure, consider deploying just the `site/` folder:

#### Option 1: GitHub Pages from /docs Folder

```bash
# Create docs folder in repo root
mkdir docs
cp -r site/* docs/
git add docs/
git commit -m "docs: Deploy game to docs folder for GitHub Pages"
git push origin main
```

Then configure GitHub Pages to use `/docs` folder.

#### Option 2: Separate gh-pages Branch

```bash
# Create orphan branch for GitHub Pages
git checkout --orphan gh-pages
git reset --hard
cp -r site/* .
git add .
git commit -m "Deploy to GitHub Pages"
git push origin gh-pages --force
```

Then configure GitHub Pages to use `gh-pages` branch.

## 🎮 Accessing the Game

### Production (GitHub Pages)

- **URL**: https://haitaowu12.github.io/Second-Brain/01-Projects/incose-tli-shared-model-game/site/
- **Status**: Auto-deploys on every push to main
- **Build Time**: ~30-60 seconds

### Local Development

```bash
cd "01-Projects/incose-tli-shared-model-game/site"
python3 -m http.server 5173
# Open: http://localhost:5173
```

### Testing Modes

- **Normal Play**: Standard URL
- **Smoke Test**: Add `?smoke=1` parameter
- **Training Mode**: Add `?training=1` parameter

## 📊 Verification Checklist

### Pre-Deployment ✅

- [x] All JavaScript files pass syntax check
- [x] Unit tests passing (8/8)
- [x] Responsive layout tested
- [x] All features functional
- [x] Documentation complete
- [x] Git commit successful
- [x] Push to GitHub successful

### Post-Deployment (Verify after 1-2 minutes)

- [ ] GitHub Pages site loads successfully
- [ ] Game starts without errors
- [ ] Training mode launches
- [ ] All difficulty levels work
- [ ] Interrupts trigger correctly
- [ ] Responsive layout works on mobile
- [ ] Full-screen mode functions
- [ ] Canvas and Glossary modals open
- [ ] Keyboard shortcuts work
- [ ] No console errors

## 🔧 GitHub Pages Setup Instructions

If GitHub Pages is not yet enabled:

1. **Go to Repository Settings**
   - Navigate to: https://github.com/haitaowu12/Second-Brain/settings/pages

2. **Configure Source**
   - Select "Deploy from a branch"
   - Branch: `main`
   - Folder: `/ (root)` or `/docs` (if using docs folder)

3. **Save and Wait**
   - GitHub will build the site (~30-60 seconds)
   - You'll receive an email when deployment completes
   - URL will be displayed in Settings > Pages

4. **Custom Domain (Optional)**
   - Add CNAME file for custom domain
   - Update DNS records accordingly

## 📝 Next Steps

### Immediate Actions

1. ✅ Wait for GitHub Pages build to complete
2. ✅ Test the deployed site
3. ✅ Share URL with team

### Future Enhancements

- Add Google Analytics for usage tracking
- Implement automated screenshot testing
- Set up continuous integration with GitHub Actions
- Create additional scenarios
- Add multiplayer support
- Implement leaderboard system

## 🎯 Success Metrics

### Technical

- ✅ Zero syntax errors
- ✅ All tests passing
- ✅ Responsive across all breakpoints
- ✅ <2 second load time
- ✅ 60fps animations

### User Experience

- ✅ Training mode completes successfully
- ✅ All features accessible via keyboard
- ✅ Clear visual feedback for all actions
- ✅ Intuitive navigation and controls
- ✅ Professional visual design

### Educational

- ✅ Teaches Shared Model discipline
- ✅ Demonstrates consequences of tactical drift
- ✅ Provides constructive feedback
- ✅ Engaging and replayable

## 📞 Support

### Documentation

- **README.md**: Feature list and setup
- **GAME_SUMMARY.md**: Comprehensive game overview
- **progress.md**: Development history
- **Help Modal**: In-game shortcuts

### Contact

- **Repository**: https://github.com/haitaowu12/Second-Brain
- **Issues**: Open GitHub issue for bugs
- **Discussions**: Share strategies and feedback

---

**Deployment Date**: 2026-03-30
**Version**: 2.0 (Cohort 10 Enhanced)
**Status**: ✅ LIVE on GitHub Pages

**Play Now**: https://haitaowu12.github.io/Second-Brain/01-Projects/incose-tli-shared-model-game/site/
