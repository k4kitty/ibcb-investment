# Move To Learn English Website — Implementation Plan

> **For Hermes:** Build with subagents in parallel for content generation, assemble into a single-page SPA.

**Goal:** Build a comprehensive English learning single-page website (SPA) for Move To Learn, under IBCB Investment. 12 grade levels (age 5-17), each with 20 games. 200 reading comprehension passages with 4 Q&A each. Trophy reward system.

**Architecture:** Pure frontend SPA — one HTML file, one JS file (engine + all content data), one CSS file. Progress saved in localStorage. No backend needed for games.

**Tech Stack:** Vanilla HTML/CSS/JavaScript (matching IBCB's existing stack: Inter + system fonts, black-white minimalist). No frameworks.

---

## Files to Create

| File | Purpose |
|------|---------|
| `mtl-english.html` | Single-page shell: header/footer matching IBCB, main game container |
| `public/css/mtl-english.css` | MTL-specific styles — levels grid, game cards, trophy animations, progress bars |
| `public/js/mtl-english.js` | Complete game engine + all content data (12 levels × 20 games + 200 passages) |

---

## Architecture

### Data Model

```
Level (1-12)
├── name: "Grade 1"
├── ageRange: "5-6"
├── description: "..."
├── games: [20 Game objects]
│   ├── type: "comprehension" | "spelling" | "vocabulary" | "grammar" | "wordsearch" | "matching" | "fillblank" | "ordering"
│   ├── title: "..."
│   ├── passage: "..." (for comprehension type)
│   ├── questions: [{q, options: [4], answer: index}]
│   └── trophyEarned: boolean
└── levelTrophy: boolean
```

### Game Types

1. **Comprehension** — Reading passage + 4 multiple-choice questions
2. **Spelling** — Hear/see word, type correct spelling
3. **Vocabulary** — Word-definition matching
4. **Grammar** — Fill in correct grammar (tense, preposition, etc.)
5. **Word Search** — Find words in letter grid
6. **Matching** — Drag/concept match pairs
7. **Fill in Blank** — Cloze passage
8. **Sentence Ordering** — Reorder scrambled sentences

### Reward System

- ⭐ Trophy sticker for each correct answer (per-question)
- 🏆 Big golden trophy for completing all 20 games in a level
- Progress bar showing X/20 games completed per level
- Visual trophy collection on dashboard

### Game Progression Logic

- Level starts locked → must complete previous level to unlock
- Each level has 20 games in fixed order
- Complete a game = answer all questions correctly in one attempt
- Wrong answer → retry (no penalty, educational approach for kids)
- All 20 games passed → level trophy awarded → next level unlocks

---

## Content Distribution

### Comprehension Passages (200 total)
Spread across 12 levels, weighted toward higher grades:

| Grades | Passages |
|--------|----------|
| Grade 1-2 | 12 passages each (24 total) |
| Grade 3-4 | 16 passages each (32 total) |
| Grade 5-6 | 18 passages each (36 total) |
| Grade 7-8 | 18 passages each (36 total) |
| Grade 9-10 | 18 passages each (36 total) |
| Grade 11-12 | 18 passages each (36 total) |

### Games Per Level (20 total)
| Type | Count per Level |
|------|----------------|
| Reading Comprehension | 4-6 |
| Spelling | 3-4 |
| Vocabulary | 3-4 |
| Grammar | 3-4 |
| Word Search | 2 |
| Matching | 2 |
| Fill in Blank | 1-2 |
| Sentence Ordering | 1-2 |

---

## Build Tasks

### Phase 1: Shell & Engine (I build this)

- Task 1: Create `mtl-english.html` — page shell with IBCB header/footer
- Task 2: Create `public/css/mtl-english.css` — all styles
- Task 3: Create `public/js/mtl-english.js` — complete game engine (rendering, logic, localStorage, trophy system, level progression, all 8 game type renderers)

### Phase 2: Content Generation (subagents in parallel)

Each subagent receives: level number, age range, difficulty guidelines, game type templates.

**Batch 1 (6 subagents):** Content for Levels 1-6
**Batch 2 (6 subagents):** Content for Levels 7-12

Each subagent outputs a JavaScript object following the exact schema.

### Phase 3: Assembly

- Task: Merge all 12 level content objects into the main JS file
- Task: Test the full site — navigate levels, play games, verify progression, trophy system
- Task: Add `mtl-english.html` to IBCB navigation

---

## CSS Design System

```css
/* MTL Color Palette — kid-friendly but professional */
--mtl-primary: #1a1a1a;       /* Black text (IBCB brand) */
--mtl-accent: #f5a623;        /* Warm gold for trophies */
--mtl-success: #2ecc71;       /* Green for correct */
--mtl-error: #e74c3c;         /* Red for incorrect */
--mtl-bg: #ffffff;
--mtl-card-bg: #fafafa;
--mtl-level-locked: #e0e0e0;
--mtl-trophy-gold: #ffd700;

/* Game Card */
--mtl-radius: 12px;
--mtl-shadow: 0 2px 12px rgba(0,0,0,0.08);
```

## IBCB Navigation Integration

Add to all page headers:
```html
<a href="mtl-english.html" class="nav-link">Move To Learn</a>
```

---

## Verification

1. Open `mtl-english.html` in browser
2. Verify 12 levels visible, Grade 1 unlocked, rest locked
3. Complete Grade 1 games → trophy appears → Grade 2 unlocks
4. Refresh page → progress persists (localStorage)
5. All 8 game types render and function correctly
6. Trophy stickers appear on correct answers
7. Responsive design — works on tablet and desktop
