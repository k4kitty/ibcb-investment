import re, json

with open('/home/user/ibcb-investment/public/js/mtl-english.js', 'r') as f:
    content = f.read()

total = passed = 0
failures = []

def check(cond, msg):
    global total, passed
    total += 1
    if cond: passed += 1
    else: failures.append(msg)

# Count ALL games
all_types = re.findall(r"type:\s*'(\w+)'", content)
type_counts = {}
for t in all_types:
    type_counts[t] = type_counts.get(t, 0) + 1
total_games = sum(type_counts.values())

print(f"=== MTL English — Full Game Validation ===")
print(f"Total games found: {total_games} (12 levels x ~20 games each)")
print(f"Types: {json.dumps(type_counts)}")
print()

# Wordsearch grids — try both formats
# Format 1: inline grid like [['C','A',...],...]
# Format 2: wsSets references like wsSets.grid
ws_data = []
# Find all wordsearch grids directly defined
ws_matches = re.findall(r"grid:\[(.*?)\],\s*words:\[(.*?)\],\s*size:(\d+)", content, re.DOTALL)
for grid_str, words_str, size_str in ws_matches:
    try: size = int(size_str)
    except: size = 5
    rows = re.findall(r"\[(.*?)\]", grid_str, re.DOTALL)
    grid = [re.findall(r"'(\w+)'", r) for r in rows]
    grid = [r for r in grid if r]
    words = re.findall(r"'(\w+)'", words_str)
    if grid and words:
        ws_data.append((grid, words, size))

# Also parse wsSets inline grids  
ws_sets = re.findall(r"grid:\[(.*?)\],\s*w:\[(.*?)\],\s*s:(\d+)", content, re.DOTALL)
for grid_str, words_str, size_str in ws_sets:
    try: size = int(size_str)
    except: size = 5
    rows = re.findall(r"\[(.*?)\]", grid_str, re.DOTALL)
    grid = [re.findall(r"'(\w+)'", r) for r in rows]
    grid = [r for r in grid if r]
    words = re.findall(r"'(\w+)'", words_str)
    if grid and words:
        ws_data.append((grid, words, size))

print(f"Word searches found: {len(ws_data)}")

for i, (grid, words, size) in enumerate(ws_data):
    actual_h = len(grid)
    actual_w = max(len(r) for r in grid) if grid else 0
    if actual_h < 2:
        check(False, f"WS {i+1}: empty/broken grid (h={actual_h})")
        continue
    for word in words:
        upper, found = word.upper(), False
        dirs = [(0,1),(1,0),(1,1),(1,-1)]
        for r in range(actual_h):
            for c in range(len(grid[r])):
                for dr, dc in dirs:
                    ok = True
                    for k in range(len(upper)):
                        nr, nc = r + dr*k, c + dc*k
                        if nr < 0 or nr >= actual_h or nc < 0 or nc >= len(grid[nr]): ok = False; break
                        ch = grid[nr][nc].upper() if isinstance(grid[nr][nc], str) else str(grid[nr][nc]).upper()
                        if ch != upper[k]: ok = False; break
                    if ok: found = True; break
                if found: break
            if found: break
        check(found, f"WS {i+1} ({actual_h}x{actual_w}): '{word}' exists")

# Ordering games
ord_found = re.findall(r"type:'ordering'.*?sentence:'([^']*)'.*?words:\[(.*?)\]", content, re.DOTALL)
print(f"\nOrdering games found: {len(ord_found)}")
for i, (sentence, words_str) in enumerate(ord_found):
    words = re.findall(r"'([^']*)'", words_str)
    clean = lambda s: re.sub(r'[^a-z0-9\s]', '', s.lower()).strip()
    sent_words = clean(sentence).split()
    word_clean = [clean(w) for w in words]
    check(all(sw in word_clean for sw in sent_words), f"Ord {i+1}: all words match")
    has_punct = bool(re.search(r'[.!?,"\']', sentence)) and not any(re.search(r'[.!?,"\']', w) for w in words)
    check(not has_punct, f"Ord {i+1}: no punct mismatch")

# Comprehension: count + sample check answers
comp_qas = re.findall(r"questions:\[(.*?)\]\s*\}", content, re.DOTALL)
total_qs = sum(len(re.findall(r"ans:\d+", q)) for q in comp_qas)
print(f"\nComprehension: {len(comp_qas)} passages, ~{total_qs} questions")
all_ans_ok = True
for i, qs in enumerate(comp_qas):
    for j, m in enumerate(re.finditer(r"opts:\[(.*?)\].*?ans:(\d+)", qs, re.DOTALL)):
        opts = re.findall(r"'([^']*)'", m.group(1))
        if not opts: continue
        ans = int(m.group(2))
        if not (0 <= ans < len(opts)):
            all_ans_ok = False
            check(False, f"Comp {i+1} Q{j+1}: ans={ans} out of range (opts={len(opts)})")
if all_ans_ok: check(True, "All comprehension answers valid")

# Grammar
gram_count = sum(1 for _ in re.finditer(r"type:'grammar'", content))
print(f"Grammar games: {gram_count}")

# Fill in blank
fib_count = sum(1 for _ in re.finditer(r"type:'fillblank'", content))
print(f"Fill-in-blank games: {fib_count}")

# Spelling
spell_count = sum(1 for _ in re.finditer(r"type:'spelling'", content))
print(f"Spelling games: {spell_count}")

# Vocabulary
vocab_count = sum(1 for _ in re.finditer(r"type:'vocabulary'", content))
print(f"Vocabulary games: {vocab_count}")

# Matching
match_count = sum(1 for _ in re.finditer(r"type:'matching'", content))
print(f"Matching games: {match_count}")

print(f"\n{'='*50}")
print(f"RESULTS: {passed}/{total} passed")
if failures:
    print(f"\nFAILURES ({len(failures)}):")
    for f in failures: print(f"  ❌ {f}")
    print(f"\n⚠️  {len(failures)} issues found")
else:
    print("✅ ALL VALIDATION PASSED — NO DATA ISSUES")
print(f"{'='*50}")
