// MTL English — Full Test Script
// Tests all 12 levels x 20 games for data validity and game logic
// Run in Node.js: node test-mtl-games.js
// Or paste into browser console

const fs = require('fs');
const path = require('path');

// Extract game data from mtl-english.js
const jsContent = fs.readFileSync(path.join(__dirname, 'public', 'js', 'mtl-english.js'), 'utf8');

// We'll use a simpler approach: create a virtual DOM and evaluate the content
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

// Evaluate the JS to get MTL_CONTENT
eval(jsContent);

const levels = MTL_CONTENT.levels;
let totalTests = 0, passed = 0, failed = 0;
const failures = [];

function assert(condition, msg) {
    totalTests++;
    if (condition) { passed++; }
    else { failed++; failures.push(msg); }
}

console.log('=== MTL English — Full Game Test ===\n');
console.log(`Testing ${levels.length} levels...\n`);

levels.forEach((level, li) => {
    console.log(`\n--- Level ${level.id}: ${level.name} (${level.games.length} games) ---`);
    
    level.games.forEach((game, gi) => {
        const gameNum = gi + 1;
        const prefix = `  Game ${gameNum} [${game.type}] "${game.title}":`;
        
        switch (game.type) {
            case 'comprehension': {
                assert(game.passage && game.passage.length > 10, `${prefix} passage exists (${game.passage.length} chars)`);
                assert(game.questions && game.questions.length > 0, `${prefix} has ${game.questions?.length || 0} questions`);
                if (game.questions) {
                    game.questions.forEach((q, qi) => {
                        assert(q.opts && q.opts.length >= 2, `${prefix} Q${qi+1} has ${q.opts?.length || 0} options`);
                        assert(typeof q.ans === 'number' && q.ans >= 0 && q.ans < (q.opts?.length || 0), 
                            `${prefix} Q${qi+1} answer index ${q.ans} is valid (0-${(q.opts?.length || 0)-1})`);
                    });
                }
                break;
            }
            
            case 'spelling': {
                assert(game.words && game.words.length > 0, `${prefix} has ${game.words?.length || 0} words`);
                if (game.words) {
                    game.words.forEach((w, wi) => {
                        assert(w.word && w.word.length > 0, `${prefix} word ${wi+1} "${w.word}" valid`);
                        assert(w.hint && w.hint.length > 0, `${prefix} word ${wi+1} has hint`);
                    });
                }
                break;
            }
            
            case 'vocabulary': {
                assert(game.pairs && game.pairs.length > 0, `${prefix} has ${game.pairs?.length || 0} pairs`);
                if (game.pairs) {
                    game.pairs.forEach((p, pi) => {
                        assert(p.word && p.match, `${prefix} pair ${pi+1}: "${p.word}" → "${p.match}"`);
                    });
                }
                break;
            }
            
            case 'grammar': {
                assert(game.sentences && game.sentences.length > 0, `${prefix} has ${game.sentences?.length || 0} sentences`);
                if (game.sentences) {
                    game.sentences.forEach((s, si) => {
                        assert(s.opts && s.opts.length >= 2, `${prefix} S${si+1} has ${s.opts?.length || 0} options`);
                        assert(typeof s.ans === 'number' && s.ans >= 0 && s.ans < (s.opts?.length || 0),
                            `${prefix} S${si+1} answer ${s.ans} valid (0-${(s.opts?.length || 0)-1})`);
                        const hasBlank = s.sentence.includes(s.blank || '___');
                        assert(hasBlank, `${prefix} S${si+1} has blank marker`);
                    });
                }
                break;
            }
            
            case 'wordsearch': {
                const grid = game.grid;
                const size = game.size || (grid ? grid.length : 0);
                assert(grid && Array.isArray(grid), `${prefix} grid exists`);
                assert(game.words && game.words.length > 0, `${prefix} has ${game.words?.length || 0} words`);
                assert(size >= 3, `${prefix} grid size ${size}x${size}`);
                
                if (grid && game.words) {
                    game.words.forEach((word, wi) => {
                        const upper = word.toUpperCase();
                        const len = upper.length;
                        let found = false;
                        const dirs = [[0,1],[1,0],[1,1],[1,-1]];
                        
                        for (let r = 0; r < size && !found; r++) {
                            for (let c = 0; c < size && !found; c++) {
                                for (const [dr, dc] of dirs) {
                                    let match = true;
                                    for (let i = 0; i < len; i++) {
                                        const nr = r + dr * i, nc = c + dc * i;
                                        if (nr < 0 || nr >= size || nc < 0 || nc >= size) { match = false; break; }
                                        const ch = (grid[nr]?.[nc] || '').toUpperCase();
                                        if (ch !== upper[i]) { match = false; break; }
                                    }
                                    if (match) { found = true; break; }
                                }
                            }
                        }
                        assert(found, `${prefix} word "${word}" EXISTS in grid`);
                    });
                }
                break;
            }
            
            case 'matching': {
                assert(game.left && game.left.length > 0, `${prefix} has ${game.left?.length || 0} left items`);
                assert(game.right && game.right.length > 0, `${prefix} has ${game.right?.length || 0} right items`);
                assert(game.pairs && game.pairs.length > 0, `${prefix} has ${game.pairs?.length || 0} pairs`);
                break;
            }
            
            case 'fillblank': {
                assert(game.text && game.text.length > 0, `${prefix} text exists`);
                assert(game.blanks && game.blanks.length > 0, `${prefix} has ${game.blanks?.length || 0} blanks`);
                if (game.blanks) {
                    game.blanks.forEach((b, bi) => {
                        assert(b.opts && b.opts.length >= 2, `${prefix} blank ${bi+1} has ${b.opts?.length || 0} options`);
                        assert(typeof b.ans === 'number' && b.ans >= 0 && b.ans < (b.opts?.length || 0),
                            `${prefix} blank ${bi+1} answer ${b.ans} valid`);
                    });
                }
                break;
            }
            
            case 'ordering': {
                assert(game.sentence && game.sentence.length > 0, `${prefix} sentence: "${game.sentence.substring(0, 40)}..."`);
                assert(game.words && game.words.length > 1, `${prefix} has ${game.words?.length || 0} words`);
                if (game.sentence && game.words) {
                    // Verify all words in the sentence appear in the word list (case-insensitive)
                    const cleanSentence = game.sentence.toLowerCase().replace(/[^a-z0-9\s]/g, '');
                    const sentenceWords = cleanSentence.split(/\s+/).filter(w => w.length > 0);
                    const wordListLower = game.words.map(w => w.toLowerCase());
                    const allPresent = sentenceWords.every(sw => wordListLower.includes(sw));
                    assert(allPresent, `${prefix} all sentence words in word list`);
                    
                    // Verify sentence doesn't have trailing punctuation without matching word
                    const hasPunctWord = game.words.some(w => /[.!?,]/.test(w));
                    const sentenceHasPunct = /[.!?,"']/.test(game.sentence);
                    if (sentenceHasPunct && !hasPunctWord) {
                        assert(false, `${prefix} WARNING: sentence has punctuation but word list doesn't include it`);
                    }
                }
                break;
            }
            
            default:
                assert(false, `${prefix} UNKNOWN game type: ${game.type}`);
        }
    });
});

console.log(`\n\n========================================`);
console.log(`RESULTS: ${passed}/${totalTests} passed, ${failed} failed`);
if (failures.length > 0) {
    console.log(`\nFAILURES:`);
    failures.forEach(f => console.log(`  ❌ ${f}`));
}
console.log(`========================================`);
process.exit(failed > 0 ? 1 : 0);
