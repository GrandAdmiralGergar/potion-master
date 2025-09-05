import React, { useEffect, useState, useMemo } from "react";
import { create } from "zustand";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Check, X, Sun, Moon, Leaf, Flame, Droplets, Mountain, Wind } from "lucide-react";

/**************************************
 * Potion Puzzle — React/TS MVP (Full)
 * -----------------------------------
 * - 8 elements in 4 opposing pairs
 * - Ingredients have exactly 3 elements (no opposing)
 * - Brew rule: element triggers if (count(e) - count(opp(e)) >= 2)
 * - Null effect when none trigger
 * - Generator ensures ≥1 basic potion per element (≤4 ingredients)
 * - Deduction Grid: 6 states (Left/Right/None/NotLeft/NotRight/Unknown)
 * - Modes: Target Order, Profile Hunt (shows target profile), Full Mapping
 * - Submit + failure counts (Profile Hunt & Full Mapping)
 * - Success banner when won
 * - Debug checkbox shows ingredient properties (sorted by pair order)
 * - Expected outcome preview next to Brew (conservative bounds)
 * - Debug in Target Order shows exact winning combo
 * - Target Order always solvable (picked from actual brewable combos)
 * - LocalStorage seed/mode + Daily seed; MemoryRouter to avoid CSP
 * - Brew list uses clickable cards (no checkboxes)
 * - **Option A applied**: newGame() forces 8 ingredients (min=max=8)
 * - **New**: Target Order tries to pick a target that needs ≥ 3 ingredients
 **************************************/

/************ Types & Constants ************/
export type Element =
  | "Sun"
  | "Moon"
  | "Air"
  | "Earth"
  | "Water"
  | "Fire"
  | "Plant"
  | "Animal";

export const ALL_ELEMENTS: Element[] = [
  "Sun",
  "Moon",
  "Air",
  "Earth",
  "Water",
  "Fire",
  "Plant",
  "Animal",
];

export const OPPONENT: Record<Element, Element> = {
  Sun: "Moon",
  Moon: "Sun",
  Air: "Earth",
  Earth: "Air",
  Water: "Fire",
  Fire: "Water",
  Plant: "Animal",
  Animal: "Plant",
};

export const PAIRS: [Element, Element][] = [
  ["Sun", "Moon"],
  ["Air", "Earth"],
  ["Water", "Fire"],
  ["Plant", "Animal"],
];

// Consistent display order across UI
export const ORDER_INDEX: Record<Element, number> = {
  Sun: 0,
  Moon: 1,
  Air: 2,
  Earth: 3,
  Water: 4,
  Fire: 5,
  Plant: 6,
  Animal: 7,
};

export type Mark = "Unknown" | Element | "None" | "NotLeft" | "NotRight";

export type Ingredient = {
  id: string;
  name: string;
  elements: Element[]; // length 3, unique, no opposing pair
};

export type BrewResult = { effects: Element[]; isNull: boolean };
export type Mode = "profile-hunt" | "full-mapping" | "target-order";

/************ RNG (seeded) ************/
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStringToInt(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function dailySeedString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `daily-${y}-${m}-${d}`;
}

/************ Utility ************/
const choose = <T,>(arr: T[], rnd: () => number): T => arr[Math.floor(rnd() * arr.length)];
function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function unique<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }

/************ Core Logic ************/
export function brew(ingredients: Ingredient[]): BrewResult {
  const counts: Record<Element, number> = ALL_ELEMENTS.reduce((acc, e) => {
    acc[e] = 0;
    return acc;
  }, {} as Record<Element, number>);

  ingredients.forEach((ing) => ing.elements.forEach((e) => (counts[e] += 1)));

  const effects: Element[] = [];
  for (const e of ALL_ELEMENTS) {
    const opp = OPPONENT[e];
    if (counts[e] - counts[opp] >= 2) {
      if (!effects.includes(opp)) effects.push(e);
    }
  }
  effects.sort((a, b) => ORDER_INDEX[a] - ORDER_INDEX[b]);
  return { effects, isNull: effects.length === 0 };
}

/************ Generator ************/
const GenConfigSchema = z.object({
  seed: z.string(),
  daily: z.boolean().default(false),
  maxCombo: z.number().int().min(2).max(4).default(4),
  elementsPerIngredient: z.literal(3),
  minIngredients: z.number().int().min(4).default(8),
  maxIngredients: z.number().int().min(8).default(14),
});
export type GenConfig = z.infer<typeof GenConfigSchema>;

function makeIngredientName(idx: number): string {
  const syllA = ["Ar", "Bel", "Cyn", "Dra", "Eld", "Fae", "Gry", "Hex", "Iri", "Jyn", "Kal", "Lum", "Myr", "Nyx", "Ori", "Py", "Qua", "Ryn", "Syl", "Tor", "Umb", "Vex", "Wyr", "Xil", "Yor", "Zin"];
  const syllB = ["a", "e", "i", "o", "u", "ae", "ia", "oi", "ou", "au"]; 
  const syllC = ["leaf", "bloom", "root", "dust", "stone", "ash", "scale", "petal", "moss", "thorn", "ember", "dew", "horn", "fang", "bark", "spore", "bud", "pith", "sepal", "gale", "flare", "tide", "glow", "shade", "howl", "hush"];
  return `${syllA[idx % syllA.length]}${syllB[idx % syllB.length]} ${syllC[idx % syllC.length]}`;
}

function canAddElementToIngredient(current: Element[], e: Element): boolean {
  if (current.includes(e)) return false;
  return !current.some((x) => OPPONENT[x] === e || OPPONENT[e] === x);
}

function randomIngredient(rnd: () => number): Element[] {
  const els: Element[] = [];
  const pool = shuffle(ALL_ELEMENTS, rnd);
  for (const e of pool) {
    if (canAddElementToIngredient(els, e)) {
      els.push(e);
      if (els.length === 3) break;
    }
  }
  while (els.length < 3) {
    const e = choose(ALL_ELEMENTS, rnd);
    if (canAddElementToIngredient(els, e)) els.push(e);
  }
  return els;
}

function hasBasicPotionFor(target: Element, ingredients: Ingredient[], maxCombo: number): boolean {
  const n = ingredients.length;
  const checkSubset = (subset: number[]): boolean => {
    if (subset.length < 2 || subset.length > maxCombo) return false;
    const res = brew(subset.map((i) => ingredients[i]));
    return !res.isNull && res.effects.includes(target);
  };
  for (let size = 2; size <= Math.min(maxCombo, n); size++) {
    const stack: number[] = [];
    const rec = (start: number) => {
      if (stack.length === size) return checkSubset(stack);
      for (let i = start; i < n; i++) { stack.push(i); if (rec(i + 1)) return true; stack.pop(); }
      return false;
    };
    if (rec(0)) return true;
  }
  return false;
}

export function generateGame(cfgInput: Partial<GenConfig>) {
  // Parse requested config once (base). We'll try salted seeds to prefer
  // Target Order combos that need ≥ 3 ingredients.
  const baseCfg = GenConfigSchema.parse({
    seed: cfgInput.daily ? dailySeedString() : cfgInput.seed ?? `${Date.now()}`,
    daily: cfgInput.daily ?? false,
    maxCombo: cfgInput.maxCombo ?? 4,
    elementsPerIngredient: 3 as const,
    minIngredients: cfgInput.minIngredients ?? 8,
    maxIngredients: cfgInput.maxIngredients ?? 14,
  });

  type Built = {
    cfg: GenConfig;
    seed: string;
    ingredients: Ingredient[];
    profileHuntTarget: Ingredient;
    fullMappingProfiles: { id: string; elements: Element[] }[];
    targetOrder: Element[];
    minSizeForTarget: number;
  };

  const buildWithSeed = (seedStr: string): Built => {
    const cfg: GenConfig = { ...baseCfg, seed: seedStr } as GenConfig;
    const seedInt = hashStringToInt(cfg.seed);
    const rnd = mulberry32(seedInt);

    const targetCount = Math.floor(cfg.minIngredients + rnd() * (cfg.maxIngredients - cfg.minIngredients + 1));

    const ingredients: Ingredient[] = [];
    while (ingredients.length < targetCount) {
      const els = randomIngredient(rnd);
      const name = makeIngredientName(ingredients.length);
      ingredients.push({ id: `${ingredients.length}`, name, elements: els });
    }

    // Ensure coverage for each element
    for (const e of ALL_ELEMENTS) {
      if (!hasBasicPotionFor(e, ingredients, cfg.maxCombo)) {
        const others = shuffle(ALL_ELEMENTS.filter((x) => x !== e && x !== OPPONENT[e]), rnd);
        const add: Element[] = [e];
        for (const x of others) {
          if (canAddElementToIngredient(add, x)) add.push(x);
          if (add.length === 3) break;
        }
        while (add.length < 3) {
          const x = choose(ALL_ELEMENTS.filter((x) => x !== e && x !== OPPONENT[e]), rnd);
          if (canAddElementToIngredient(add, x)) add.push(x);
        }
        const name = makeIngredientName(ingredients.length);
        ingredients.push({ id: `${ingredients.length}`, name, elements: add });
      }
    }

    // De-duplicate exact element triples
    const seen = new Set<string>();
    for (let i = 0; i < ingredients.length; i++) {
      let key = ingredients[i].elements.slice().sort().join("|");
      while (seen.has(key)) {
        const idx = Math.floor(rnd() * 3);
        const current = ingredients[i].elements;
        const pool = shuffle(
          ALL_ELEMENTS.filter((x) => !current.includes(x) && !current.some((y) => OPPONENT[y] === x)),
          rnd
        );
        if (pool.length) current[idx] = pool[0];
        key = current.slice().sort().join("|");
      }
      seen.add(key);
    }

    const profileHuntTarget: Ingredient = choose(ingredients, rnd);
    const fullMappingProfiles = ingredients.map((i) => ({ id: i.id, elements: i.elements }));

    // Enumerate all valid brews (size 2..maxCombo)
    const allCombos: { ids: string[]; effects: Element[]; size: number }[] = [];
    const n = ingredients.length;
    for (let size = 2; size <= Math.min(cfg.maxCombo, n); size++) {
      const stack: number[] = [];
      const dfs = (start: number) => {
        if (stack.length === size) {
          const picked = stack.map((i) => ingredients[i]);
          const res = brew(picked);
          if (!res.isNull) {
            const ids = stack.map((i) => ingredients[i].id);
            allCombos.push({ ids, effects: res.effects.slice().sort((a,b)=>ORDER_INDEX[a]-ORDER_INDEX[b]), size });
          }
          return;
        }
        for (let i = start; i < n; i++) { stack.push(i); dfs(i + 1); stack.pop(); }
      };
      dfs(0);
    }

    // Deduplicate by effects; retain minimal size for each effects set
    const byKey = new Map<string, { ids: string[]; effects: Element[]; size: number }[]>();
    for (const c of allCombos) {
      const key = c.effects.join("|");
      const arr = byKey.get(key) ?? [];
      arr.push(c);
      byKey.set(key, arr);
    }
    const uniqueCombos = Array.from(byKey.values()).map(arr => arr.sort((a,b)=>a.size-b.size)[0]);

    // Prefer effects whose minimal required size ≥ 3
    const hardCombos = uniqueCombos.filter(c => c.size >= 3);
    const pool = hardCombos.length ? hardCombos : uniqueCombos;
    const chosen = pool[Math.floor((rnd()) * pool.length)];
    const targetOrder = chosen.effects;
    const minSizeForTarget = chosen.size;

    return { cfg, seed: cfg.seed, ingredients, profileHuntTarget, fullMappingProfiles, targetOrder, minSizeForTarget };
  };

  // Try up to 12 salted seeds to find a target that needs ≥3 ingredients
  const baseSeedStr = baseCfg.seed;
  let lastBuilt: ReturnType<typeof buildWithSeed> | null = null;
  for (let attempt = 0; attempt < 12; attempt++) {
    const salted = attempt === 0 ? baseSeedStr : `${baseSeedStr}#${attempt}`;
    const built = buildWithSeed(salted);
    lastBuilt = built;
    if (built.minSizeForTarget >= 3) return built;
  }
  // Fallback: ensure solvable even if target needs only 2
  return lastBuilt ?? buildWithSeed(`${baseSeedStr}#fallback`);
}

/************ Helpers ************/
export type GridStateCell = Mark;

export function elementsFromMarks(marks: Record<string, GridStateCell>, pairs: [Element, Element][]): Element[] | null {
  const chosen: Element[] = [];
  for (let i = 0; i < pairs.length; i++) {
    const m = marks[String(i)];
    if (m && m !== "Unknown" && m !== "None" && m !== "NotLeft" && m !== "NotRight") chosen.push(m as Element);
  }
  if (chosen.length !== 3) return null; // exactly 3 to count as a definitive profile
  chosen.sort((a, b) => ORDER_INDEX[a] - ORDER_INDEX[b]);
  return chosen;
}

export function sameSet(a: Element[] | null, b: Element[] | null): boolean {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every((x) => b.includes(x));
}

// Expected outcome helper used by BrewPanel (conservative bounds)
export function expectedOutcomeForSelection(
  ids: string[],
  marks: Record<string, Record<string, GridStateCell>>
): { effects: Element[]; certain: Set<Element>; ambiguous: boolean } | null {
  if (ids.length < 2) return null;
  const chosenById: Record<string, Element[] | null> = {};
  ids.forEach((id) => (chosenById[id] = elementsFromMarks(marks[id] || {}, PAIRS)));

  const allKnown = ids.every((id) => Array.isArray(chosenById[id]));
  if (allKnown) {
    const virtuals = ids.map((id, idx) => ({ id: `v${idx}`, name: `v${idx}`, elements: chosenById[id] as Element[] }));
    const res = brew(virtuals as Ingredient[]);
    return { effects: res.effects, certain: new Set(res.effects), ambiguous: false };
  }

  // Bounds per element vs opponent
  const minCount: Record<Element, number> = Object.fromEntries(ALL_ELEMENTS.map((e) => [e, 0])) as Record<Element, number>;
  const maxCount: Record<Element, number> = Object.fromEntries(ALL_ELEMENTS.map((e) => [e, 0])) as Record<Element, number>;

  let unknownCount = 0;
  ids.forEach((id) => {
    const chosen = chosenById[id];
    if (chosen) {
      chosen.forEach((e) => {
        minCount[e] += 1;
        maxCount[e] += 1;
      });
    } else {
      unknownCount += 1; // each unknown can contribute at most 1 to any element
    }
  });

  if (unknownCount > 0) {
    for (const e of ALL_ELEMENTS) maxCount[e] += unknownCount;
  }

  const certain: Set<Element> = new Set();
  const possible: Set<Element> = new Set();
  for (const e of ALL_ELEMENTS) {
    const opp = OPPONENT[e];
    const minDiff = minCount[e] - maxCount[opp];
    const maxDiff = maxCount[e] - minCount[opp];
    if (minDiff >= 2) {
      certain.add(e);
    } else if (maxDiff >= 2) {
      possible.add(e);
    }
  }

  const effects = Array.from(new Set([...certain, ...possible])).sort((a, b) => ORDER_INDEX[a] - ORDER_INDEX[b]);
  const ambiguous = effects.length === 0 ? true : possible.size > certain.size;
  return { effects, certain, ambiguous };
}

// Find minimal-size exact set of ingredient IDs matching target effects
export function findExactSolution(
  ingredients: Ingredient[],
  targetEffects: Element[],
  maxCombo: number
): string[] | null {
  const targetSorted = [...targetEffects].sort((a, b) => ORDER_INDEX[a] - ORDER_INDEX[b]);
  const effectsEqual = (a: Element[], b: Element[]) => a.length === b.length && sameSet(a, b);

  const n = ingredients.length;
  for (let size = 2; size <= Math.min(maxCombo, n); size++) {
    const stack: number[] = [];
    const dfs = (start: number): string[] | null => {
      if (stack.length === size) {
        const picked = stack.map((i) => ingredients[i]);
        const res = brew(picked);
        if (!res.isNull && effectsEqual(res.effects, targetSorted)) {
          return stack.map((i) => ingredients[i].id);
        }
        return null;
      }
      for (let i = start; i < n; i++) {
        stack.push(i);
        const got = dfs(i + 1);
        if (got) return got;
        stack.pop();
      }
      return null;
    };
    const ans = dfs(0);
    if (ans) return ans;
  }
  return null;
}

/************ Zustand Store ************/
type GameState = {
  seed: string;
  daily: boolean;
  mode: Mode;
  ingredients: Ingredient[];
  marks: Record<string, Record<string, GridStateCell>>;
  brewLog: { ids: string[]; result: BrewResult }[];
  startedAt: number;
  potionsBrewed: number;
  nullCount: number;
  targetOrder: Element[];
  profileHuntTarget: Ingredient;
  fullMappingProfiles: { id: string; elements: Element[] }[];
  maxCombo: number;
  isWon: boolean;
  submitFailures: number;
  lastSubmitOk: boolean;
  debug: boolean;
  // actions
  newGame: (opts: { seed?: string; daily?: boolean; mode?: Mode }) => void;
  toggleMark: (ingredientId: string, pairIdx: number) => void;
  brewSelection: (ids: string[]) => BrewResult;
  setDebug: (v: boolean) => void;
  submitGrid: (mode: Exclude<Mode, "target-order">) => void;
};

export const useGame = create<GameState>((set, get) => ({
  seed: "",
  daily: false,
  mode: "target-order",
  ingredients: [],
  marks: {},
  brewLog: [],
  startedAt: Date.now(),
  potionsBrewed: 0,
  nullCount: 0,
  targetOrder: [],
  profileHuntTarget: { id: "-1", name: "", elements: ["Sun", "Air", "Water"] },
  fullMappingProfiles: [],
  maxCombo: 4,
  isWon: false,
  submitFailures: 0,
  lastSubmitOk: false,
  debug: false,
  newGame: ({ seed, daily, mode }) => {
    // **Option A**: force 8 ingredients
    const gen = generateGame({ seed, daily, maxCombo: 4, minIngredients: 8, maxIngredients: 8 });
    const marks: GameState["marks"] = {};
    for (const ing of gen.ingredients) {
      marks[ing.id] = {};
      PAIRS.forEach((_, idx) => (marks[ing.id][String(idx)] = "Unknown"));
    }
    set({
      seed: gen.seed,
      daily: !!daily,
      mode: mode ?? get().mode,
      ingredients: gen.ingredients,
      marks,
      brewLog: [],
      startedAt: Date.now(),
      potionsBrewed: 0,
      nullCount: 0,
      targetOrder: gen.targetOrder,
      profileHuntTarget: gen.profileHuntTarget,
      fullMappingProfiles: gen.fullMappingProfiles,
      maxCombo: 4,
      isWon: false,
      submitFailures: 0,
      lastSubmitOk: false,
      debug: false,
    });
    try {
      localStorage.setItem(
        "potion-puzzle-state",
        JSON.stringify({ seed: gen.seed, daily: !!daily, mode: mode ?? get().mode })
      );
    } catch {}
  },
  toggleMark: (ingredientId, pairIdx) => {
    const st = get();
    const current = st.marks[ingredientId][String(pairIdx)];
    const [left, right] = PAIRS[pairIdx];
    const cycle: GridStateCell[] = ["Unknown", left, right, "None", "NotLeft", "NotRight"];
    const next = cycle[(cycle.indexOf(current) + 1) % cycle.length];
    set({ marks: { ...st.marks, [ingredientId]: { ...st.marks[ingredientId], [String(pairIdx)]: next } } });
  },
  brewSelection: (ids) => {
    const st = get();
    if (ids.length < 2 || ids.length > st.maxCombo) return { effects: [], isNull: true };
    const ings = ids.map((id) => st.ingredients.find((x) => x.id === id)!).filter(Boolean);
    const res = brew(ings);
    if (!res.isNull && st.mode === "target-order") {
      const ok = sameSet(res.effects, st.targetOrder) && res.effects.length === st.targetOrder.length;
      if (ok) set({ isWon: true });
    }
    set({ brewLog: [...st.brewLog, { ids, result: res }], potionsBrewed: st.potionsBrewed + 1, nullCount: st.nullCount + (res.isNull ? 1 : 0) });
    return res;
  },
  setDebug: (v) => set({ debug: v }),
  submitGrid: (mode) => {
    const st = get();
    const guessFor = (ingId: string) => elementsFromMarks(st.marks[ingId], PAIRS);
    if (mode === "full-mapping") {
      for (const ing of st.ingredients) {
        const guess = guessFor(ing.id);
        const truth = [...ing.elements].sort((a, b) => ORDER_INDEX[a] - ORDER_INDEX[b]);
        if (!sameSet(guess, truth)) {
          set({ submitFailures: st.submitFailures + 1, lastSubmitOk: false });
          return;
        }
      }
      set({ lastSubmitOk: true, isWon: true });
      return;
    }
    if (mode === "profile-hunt") {
      const truth = [...st.profileHuntTarget.elements].sort((a, b) => ORDER_INDEX[a] - ORDER_INDEX[b]);
      const candidates = st.ingredients.filter((ing) => sameSet(guessFor(ing.id), truth));
      const ok = candidates.length === 1 && candidates[0].id === st.profileHuntTarget.id;
      if (ok) set({ lastSubmitOk: true, isWon: true });
      else set({ submitFailures: st.submitFailures + 1, lastSubmitOk: false });
    }
  },
}));

/************ UI Components ************/
const Pill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="px-2 py-0.5 rounded-full text-xs border shadow-sm">{children}</span>
);

function ElementIcon({ e }: { e: Element }) {
  const size = 16;
  const cls = "inline-block align-text-bottom mr-1";
  switch (e) {
    case "Sun":
      return <Sun className={cls} size={size} />;
    case "Moon":
      return <Moon className={cls} size={size} />;
    case "Air":
      return <Wind className={cls} size={size} />;
    case "Earth":
      return <Mountain className={cls} size={size} />;
    case "Water":
      return <Droplets className={cls} size={size} />;
    case "Fire":
      return <Flame className={cls} size={size} />;
    case "Plant":
      return <Leaf className={cls} size={size} />;
    case "Animal":
      return <span className={cls} style={{ width: size, height: size }}>🐾</span>;
  }
}

const EffectBadge: React.FC<{ e: Element }> = ({ e }) => (
  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs"><ElementIcon e={e} /> {e}</span>
);

function NotBadge({ e }: { e: Element }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs opacity-70"><X size={14} /> Not {e}</span>
  );
}

const SuccessBanner: React.FC = () => (
  <div className="p-3 rounded-xl border bg-green-50 text-green-900 flex items-center justify-center font-semibold">Success!</div>
);

const Header: React.FC = () => {
  const { seed, daily, newGame, mode } = useGame();
  const [seedInput, setSeedInput] = useState("");
  const nav = useNavigate();
  return (
    <div className="flex items-center justify-between gap-4 p-4 border-b bg-white sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div className="text-xl font-semibold">Potion Puzzle</div>
        <Pill>Mode: {mode}</Pill>
        <Pill>Seed: {seed}</Pill>
        {daily && <Pill>Daily</Pill>}
      </div>
      <div className="flex items-center gap-2">
        <button className="px-3 py-1 rounded-lg border shadow-sm" onClick={() => newGame({ daily: true })}>Daily</button>
        <input placeholder="custom seed" className="px-2 py-1 border rounded-lg w-40" value={seedInput} onChange={(e) => setSeedInput(e.target.value)} />
        <button className="px-3 py-1 rounded-lg border shadow-sm" onClick={() => newGame({ seed: seedInput || undefined })}>New Game</button>
        <select className="px-2 py-1 border rounded-lg" value={mode} onChange={(e) => { const next = String(e.target.value || "target-order"); nav(`/${next}`); newGame({}); }}>
          <option value="profile-hunt">Profile Hunt</option>
          <option value="full-mapping">Full Mapping</option>
          <option value="target-order">Target Order</option>
        </select>
      </div>
    </div>
  );
};

const IngredientList: React.FC<{ select: string[]; setSelect: (ids: string[]) => void }> = ({ select, setSelect }) => {
  const { ingredients, debug, maxCombo } = useGame();

  const toggle = (id: string) => {
    const isSelected = select.includes(id);
    if (isSelected) {
      setSelect(select.filter((x) => x !== id));
    } else {
      if (select.length >= maxCombo) return; // cap selections
      setSelect([...select, id]);
    }
  };

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
      {ingredients.map((ing) => {
        const selected = select.includes(ing.id);
        const sortedEls = [...ing.elements].sort((a, b) => ORDER_INDEX[a] - ORDER_INDEX[b]);
        return (
          <button
            key={ing.id}
            onClick={() => toggle(ing.id)}
            className={`text-left p-3 rounded-2xl border shadow-sm flex items-start justify-between transition-colors cursor-pointer focus:outline-none focus:ring-2 ${
              selected ? "bg-indigo-50 border-indigo-400 ring-indigo-400" : "hover:bg-gray-50"
            }`}
          >
            <div>
              <div className="font-medium">{ing.name}</div>
              {debug && (
                <div className="mt-1 flex gap-1 flex-wrap">{sortedEls.map((e) => (<EffectBadge key={e} e={e} />))}</div>
              )}
            </div>
            <div className={`mt-1 w-3 h-3 rounded-full ${selected ? "bg-indigo-500" : "bg-gray-200"}`} />
          </button>
        );
      })}
    </div>
  );
};

const BrewPanel: React.FC = () => {
  const { brewSelection, maxCombo, debug, setDebug, isWon, marks } = useGame();
  const [select, setSelect] = useState<string[]>([]);
  const [result, setResult] = useState<BrewResult | null>(null);
  const canBrew = select.length >= 2 && select.length <= maxCombo && !isWon;

  const expected = expectedOutcomeForSelection(select, marks);

  return (
    <div className="p-4 rounded-2xl border shadow-sm bg-white">
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-semibold">Brew</div>
        <div className="text-sm text-gray-500">Pick 2–{maxCombo} ingredients</div>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} /> Debug</label>
      </div>
      <IngredientList select={select} setSelect={setSelect} />
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        <button className={`px-3 py-1 rounded-lg border shadow-sm ${canBrew ? "" : "opacity-50 cursor-not-allowed"}`} disabled={!canBrew} onClick={() => setResult(brewSelection(select))}>Brew Potion</button>
        {select.length >= 2 && expected && (
          <div className="text-sm flex items-center gap-2">
            <span className="text-gray-600">Expected outcome:</span>
            <div className="flex items-center gap-1 flex-wrap">
              {expected.effects.length > 0 && expected.effects.map((e) => (<EffectBadge key={`exp-${e}`} e={e} />))}
              {expected.effects.length === 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-gray-50"><X size={14} /> Null Effect Potion</span>
              )}
              {expected.ambiguous && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs bg-gray-50">Unknown</span>
              )}
            </div>
          </div>
        )}
        {result && (
          <div className="flex items-center gap-2">
            {result.isNull ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border bg-gray-50"><X size={16} /> Null Effect Potion</span>
            ) : (
              <div className="flex items-center gap-2">{result.effects.map((e) => (<EffectBadge key={e} e={e} />))}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const BrewLog: React.FC = () => {
  const { brewLog, ingredients } = useGame();
  if (!brewLog.length) return null;
  return (
    <div className="p-4 rounded-2xl border shadow-sm bg-white">
      <div className="text-lg font-semibold mb-3">Brew Log</div>
      <div className="space-y-2">
        {brewLog.slice().reverse().map((entry, idx) => (
          <div key={idx} className="p-2 rounded-xl border flex items-center justify-between">
            <div className="text-sm">{entry.ids.map((id) => ingredients.find((i) => i.id === id)?.name).join(" + ")}</div>
            <div>{entry.result.isNull ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs"><X size={14} /> Null</span>
            ) : (
              <div className="flex gap-1">{entry.result.effects.map((e) => (<EffectBadge key={e} e={e} />))}</div>
            )}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DeductionGrid: React.FC<{ showSubmit?: boolean; onSubmit?: () => void; submitLabel?: string }> = ({ showSubmit, onSubmit, submitLabel }) => {
  const { ingredients, marks, toggleMark } = useGame();
  return (
    <div className="overflow-auto border rounded-2xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left p-2">Ingredient</th>
            {PAIRS.map(([l, r], idx) => (
              <th key={idx} className="p-2 text-center min-w-40">
                <div className="flex items-center justify-center gap-2"><EffectBadge e={l} /><span className="text-gray-400">↔</span><EffectBadge e={r} /></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ingredients.map((ing) => (
            <tr key={ing.id} className="border-t">
              <td className="p-2 font-medium">{ing.name}</td>
              {PAIRS.map((pair, idx) => {
                const mark = marks[ing.id]?.[String(idx)] ?? "Unknown";
                const [left, right] = pair;
                return (
                  <td key={idx} className="p-2 text-center">
                    <button className="px-2 py-1 rounded-lg border w-full flex items-center justify-center gap-2" onClick={() => toggleMark(ing.id, idx)} title="Toggle mark">
                      {mark === "Unknown" && <span className="text-gray-400">?</span>}
                      {mark === "None" && (<span className="inline-flex items-center gap-1"><X size={14} /> None</span>)}
                      {mark === "NotLeft" && <NotBadge e={left} />}
                      {mark === "NotRight" && <NotBadge e={right} />}
                      {mark === left && (<span className="inline-flex items-center gap-1"><Check size={14} /><ElementIcon e={left} />{left}</span>)}
                      {mark === right && (<span className="inline-flex items-center gap-1"><Check size={14} /><ElementIcon e={right} />{right}</span>)}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between p-2">
        <div className="text-xs text-gray-500 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> ? Unknown</span>
          <span className="inline-flex items-center gap-1"><X size={12} /> None</span>
          <span className="inline-flex items-center gap-1"><Check size={12} /> Chosen element</span>
          <span className="inline-flex items-center gap-1"><X size={12} /> Not Left / Not Right</span>
        </div>
        {showSubmit && (
          <button className="px-3 py-1 rounded-lg border shadow-sm" onClick={onSubmit}>{submitLabel || "Submit"}</button>
        )}
      </div>
    </div>
  );
};

/************ Modes ************/
const TargetOrderMode: React.FC = () => {
  const { targetOrder, potionsBrewed, nullCount, isWon, debug, ingredients, maxCombo } = useGame();
  const solutionIds = useMemo(() => (debug ? findExactSolution(ingredients, targetOrder, maxCombo) : null), [debug, ingredients, targetOrder, maxCombo]);
  return (
    <div className="space-y-4">
      {isWon && <SuccessBanner />}
      <div className="p-4 rounded-2xl border shadow-sm bg-white">
        <div className="text-lg font-semibold mb-2">Objective</div>
        <div className="flex items-center gap-2 flex-wrap"><span>Craft exactly:</span>{targetOrder.map((e) => (<EffectBadge key={e} e={e} />))}</div>
        <div className="mt-2 text-sm text-gray-500">No extra effects allowed.</div>
        <div className="mt-2 text-sm">Brewed: {potionsBrewed} • Nulls: {nullCount}</div>
        {debug && (
          <div className="mt-3 text-sm border-t pt-2">
            <div className="font-medium mb-1">Debug: Exact solution</div>
            {solutionIds ? (
              <div>
                <span className="text-gray-600">Use:</span>
                <span className="ml-2">{solutionIds.map((id) => ingredients.find((i) => i.id === id)?.name || id).join(" + ")}</span>
              </div>
            ) : (
              <div className="text-gray-500">No exact combo found for this seed.</div>
            )}
          </div>
        )}
      </div>
      <BrewPanel />
      <BrewLog />
      <div className="p-4 rounded-2xl border shadow-sm bg-white"><div className="text-lg font-semibold mb-2">Deduction Grid</div><DeductionGrid /></div>
    </div>
  );
};

const ProfileHuntMode: React.FC = () => {
  const { profileHuntTarget, submitGrid, lastSubmitOk, submitFailures, isWon } = useGame();
  const sortedTarget = [...profileHuntTarget.elements].sort((a, b) => ORDER_INDEX[a] - ORDER_INDEX[b]);
  return (
    <div className="space-y-4">
      {(isWon || lastSubmitOk) && <SuccessBanner />}
      <div className="p-4 rounded-2xl border shadow-sm bg-white">
        <div className="text-lg font-semibold mb-2">Objective</div>
        <div className="text-sm mb-1">Find the ingredient that exactly matches this profile:</div>
        <div className="flex flex-wrap gap-2 mb-2">{sortedTarget.map((e) => (<EffectBadge key={e} e={e} />))}</div>
        <div className="text-xs text-gray-500">Failed submissions: {submitFailures}</div>
      </div>
      <BrewPanel />
      <BrewLog />
      <div className="p-4 rounded-2xl border shadow-sm bg-white"><div className="text-lg font-semibold mb-2">Deduction Grid</div><DeductionGrid showSubmit submitLabel="Submit Guess" onSubmit={() => submitGrid("profile-hunt")} /></div>
    </div>
  );
};

const FullMappingMode: React.FC = () => {
  const { submitGrid, lastSubmitOk, submitFailures, isWon } = useGame();
  return (
    <div className="space-y-4">
      {(isWon || lastSubmitOk) && <SuccessBanner />}
      <div className="p-4 rounded-2xl border shadow-sm bg-white">
        <div className="text-lg font-semibold mb-2">Objective</div>
        <div className="text-sm">Determine the full profile (3 elements) for every ingredient.</div>
        <div className="text-xs text-gray-500 mt-1">Failed submissions: {submitFailures}</div>
      </div>
      <BrewPanel />
      <BrewLog />
      <div className="p-4 rounded-2xl border shadow-sm bg-white"><div className="text-lg font-semibold mb-2">Deduction Grid</div><DeductionGrid showSubmit onSubmit={() => submitGrid("full-mapping")} /></div>
    </div>
  );
};

/************ App ************/
const AppShell: React.FC = () => {
  const { newGame } = useGame();
  useEffect(() => {
    const saved = localStorage.getItem("potion-puzzle-state");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const safe = {
          seed: typeof parsed?.seed === "string" ? parsed.seed : undefined,
          daily: typeof parsed?.daily === "boolean" ? parsed.daily : undefined,
          mode: typeof parsed?.mode === "string" ? parsed.mode : undefined,
        } as { seed?: string; daily?: boolean; mode?: Mode };
        newGame(safe);
        return;
      } catch {}
    }
    newGame({ daily: true });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        <Routes>
          <Route path="/" element={<TargetOrderMode />} />
          <Route path="/target-order" element={<TargetOrderMode />} />
          <Route path="/profile-hunt" element={<ProfileHuntMode />} />
          <Route path="/full-mapping" element={<FullMappingMode />} />
        </Routes>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <MemoryRouter initialEntries={["/target-order"]}>
      <AppShell />
    </MemoryRouter>
  );
}

/************ Lightweight Self-Tests (console) ************/
(function runSelfTests() {
  if (typeof window === "undefined") return;
  const failures: string[] = [];
  const assert = (cond: boolean, msg: string) => { if (!cond) failures.push(msg); };

  // 0) ORDER_INDEX exists and sorts as intended
  const orderCheck = ["Plant","Sun","Water","Air","Animal","Moon","Earth","Fire"] as Element[];
  const orderSorted = [...orderCheck].sort((a,b)=>ORDER_INDEX[a]-ORDER_INDEX[b]);
  assert(orderSorted.join(",") === "Sun,Moon,Air,Earth,Water,Fire,Plant,Animal", "ORDER_INDEX sort baseline");

  // 1) Brew threshold
  const ing = (els: Element[]): Ingredient => ({ id: Math.random().toString(), name: "test", elements: els });
  let r = brew([ing(["Moon", "Air", "Water"]), ing(["Moon", "Earth", "Plant"])]);
  assert(!r.isNull && r.effects.includes("Moon"), "2 Moon vs 0 Sun should trigger Moon");
  r = brew([ing(["Moon", "Air", "Water"]), ing(["Moon", "Earth", "Plant"]), ing(["Sun", "Fire", "Animal"])]);
  assert(r.isNull || !r.effects.includes("Moon"), "2 Moon vs 1 Sun should NOT trigger Moon");

  // 2) sameSet helper
  assert(sameSet(["Sun","Water"],["Water","Sun"]) === true, "sameSet order-insensitive");
  assert(sameSet(["Sun"],["Sun","Water"]) === false, "sameSet length mismatch");

  // 3) elementsFromMarks requires exactly 3
  const fakeMarks = { "0": "Sun", "1": "Air", "2": "Water", "3": "NotLeft" } as Record<string, GridStateCell>;
  const elems = elementsFromMarks(fakeMarks, PAIRS);
  assert(Array.isArray(elems) && (elems as Element[]).length === 3, "elementsFromMarks returns 3 when exactly three chosen");

  // 4) Generator coverage (explicit 8 ingredients)
  const gen = generateGame({ seed: "test-seed", maxCombo: 4, minIngredients: 8, maxIngredients: 8 });
  const canMake = (target: Element) => {
    const ings = gen.ingredients; const n = ings.length;
    const check = (subset: number[]) => { if (subset.length < 2 || subset.length > 4) return false; const res = brew(subset.map((i) => ings[i])); return !res.isNull && res.effects.includes(target); };
    for (let size = 2; size <= Math.min(4, n); size++) {
      const stack: number[] = []; const rec = (start: number): boolean => { if (stack.length === size) return check(stack); for (let i = start; i < n; i++) { stack.push(i); if (rec(i + 1)) return true; stack.pop(); } return false; };
      if (rec(0)) return true;
    }
    return false;
  };
  for (const e of ALL_ELEMENTS) { assert(canMake(e), `Generator should allow basic potion for ${e}`); }

  // 5) Expected outcome logic
  // Case A: 2 Water known + 1 unknown => could be canceled by Fire -> ambiguous
  const idsA = ["A","B","C"]; const marksA: Record<string, Record<string, GridStateCell>> = { A: { "0": "Sun", "1": "Air", "2": "Water", "3": "None" }, B: { "0": "Moon", "1": "NotLeft", "2": "Water", "3": "None" }, C: {} } as any;
  const expA = expectedOutcomeForSelection(idsA, marksA)!; assert(expA.ambiguous === true, "Expected outcome should be ambiguous when unknown could subtract");
  // Case B: 3 Water known + 1 unknown => guaranteed Water
  const idsB = ["A","B","C","D"]; const marksB: Record<string, Record<string, GridStateCell>> = { A: { "0": "Sun", "1": "Air", "2": "Water", "3": "None" }, B: { "0": "Moon", "1": "NotLeft", "2": "Water", "3": "None" }, C: { "0": "NotRight", "1": "None", "2": "Water", "3": "None" }, D: {} } as any;
  const expB = expectedOutcomeForSelection(idsB, marksB)!; assert(expB.certain.has("Water"), "Expected outcome should guarantee Water with 3 Water vs any unknown");

  // 6) Target order must be solvable
  const sol = findExactSolution(gen.ingredients, gen.targetOrder, 4);
  assert(!!sol, "Generated targetOrder should always have at least one exact solution");

  // 7) Brew should never return opposing effects simultaneously
  const sunHeavy = brew([ing(["Sun","Air","Water"]), ing(["Sun","Earth","Plant"]), ing(["Sun","Water","Plant"])]);
  assert(!(sunHeavy.effects.includes("Sun") && sunHeavy.effects.includes("Moon")), "Brew cannot include both an element and its opponent");

  // 8) Brew results are sorted by ORDER_INDEX
  const sortedCheck = brew([ing(["Moon","Air","Water"]), ing(["Moon","Earth","Plant"])]);
  const expectedSorted = [...sortedCheck.effects].sort((a,b)=>ORDER_INDEX[a]-ORDER_INDEX[b]).join(",");
  assert(sortedCheck.effects.join(",") === expectedSorted, "Brew effects should be ORDER_INDEX sorted");

  // 9) Target Order has a valid solution within maxCombo (soft check)
  const genPref = generateGame({ seed: "pref-3", maxCombo: 4, minIngredients: 8, maxIngredients: 8 });
  const solPref = findExactSolution(genPref.ingredients, genPref.targetOrder, 4);
  assert(!!solPref && solPref.length >= 2 && solPref.length <= 4, "Target order has a valid solution within maxCombo");

  // 10) Expected outcome with fully known ingredients equals actual brew
  const sampleIds = gen.ingredients.slice(0, 2).map(i => i.id);
  const marksKnown: Record<string, Record<string, GridStateCell>> = {};
  for (const ing of gen.ingredients.slice(0, 2)) {
    const m: Record<string, GridStateCell> = {};
    PAIRS.forEach((pair, idx) => {
      const [left, right] = pair;
      if (ing.elements.includes(left)) m[String(idx)] = left;
      else if (ing.elements.includes(right)) m[String(idx)] = right;
      else m[String(idx)] = "None";
    });
    marksKnown[ing.id] = m;
  }
  const eo = expectedOutcomeForSelection(sampleIds, marksKnown)!;
  const actual = brew(gen.ingredients.slice(0,2));
  assert(!eo.ambiguous && sameSet(eo.effects, actual.effects), "Expected outcome should match actual brew when all chosen are known");

  if (failures.length) {
    console.warn("Self-tests FAILED:\n" + failures.map((f) => " - " + f).join("\n"));
  } else {
    console.log("Self-tests passed ✓");
  }
})();
