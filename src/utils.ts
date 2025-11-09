/**************************************
 * POTION PUZZLE — CORE LOGIC & UTILITIES
 * =======================================
 * 
 * This file contains all the core game logic, including:
 * - Random number generation (seeded for reproducible games)
 * - Brewing mechanics (how ingredients combine into potions)
 * - Game generation (creating ingredients and puzzles)
 * - Helper functions for deduction and analysis
 * 
 * KEY CONCEPTS:
 * - Seeded RNG: Same seed always produces same game
 * - Brewing Rule: Element triggers if (count - count_opponent >= 2)
 * - Ingredient Generation: Ensures all elements are brewable
 * - Target Selection: Prefers harder puzzles (3+ ingredients)
 **************************************/

import { z } from "zod";
import { ALL_ELEMENTS, OPPONENT, PAIRS, ORDER_INDEX } from "./types";
import type { Element, Ingredient, BrewResult, GridStateCell } from "./types";

// ===== RANDOM NUMBER GENERATION =====
// Uses seeded random number generation so the same seed always produces the same game

/**
 * Creates a seeded random number generator using the Mulberry32 algorithm
 * This ensures that the same seed always produces the same sequence of random numbers
 * @param seed - The seed value (integer)
 * @returns A function that returns random numbers between 0 and 1
 */
export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);  // Add magic constant
    t = Math.imul(t ^ (t >>> 15), t | 1);  // Mix bits
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);  // More mixing
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;  // Convert to 0-1 range
  };
}

/**
 * Converts a string to a numeric seed for the random number generator
 * Uses FNV-1a hash algorithm for good distribution
 * @param s - The string to hash
 * @returns A 32-bit integer hash
 */
export function hashStringToInt(s: string): number {
  let h = 2166136261 >>> 0;  // FNV offset basis
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);    // XOR with character
    h = Math.imul(h, 16777619);  // Multiply by FNV prime
  }
  return h >>> 0;  // Convert to unsigned 32-bit
}

/**
 * Generates a daily seed string based on the current date
 * Format: "daily-YYYY-MM-DD" (e.g., "daily-2024-01-15")
 * This allows for daily puzzles that are the same for all players
 * @returns A string seed for the current date
 */
export function dailySeedString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");  // Month is 0-indexed
  const d = String(now.getDate()).padStart(2, "0");
  return `daily-${y}-${m}-${d}`;
}

// ===== UTILITY FUNCTIONS =====
// General helper functions used throughout the game

/**
 * Randomly selects one item from an array
 * @param arr - Array to choose from
 * @param rnd - Random number generator function
 * @returns A randomly selected item
 */
export const choose = <T,>(arr: T[], rnd: () => number): T => arr[Math.floor(rnd() * arr.length)];

/**
 * Shuffles an array using the Fisher-Yates algorithm
 * Creates a new array, doesn't modify the original
 * @param arr - Array to shuffle
 * @param rnd - Random number generator function
 * @returns A new shuffled array
 */
export function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];  // Create a copy
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));  // Random index from 0 to i
    [a[i], a[j]] = [a[j], a[i]];  // Swap elements
  }
  return a;
}

/**
 * Removes duplicates from an array
 * @param arr - Array to deduplicate
 * @returns New array with unique elements only
 */
export function unique<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }

// ===== CORE BREWING LOGIC =====
// This is the heart of the game - how ingredients combine to create potions

/**
 * BREWING FUNCTION - The core game mechanic
 * 
 * How brewing works:
 * 1. Count how many times each element appears across all ingredients
 * 2. For each element, check if (count - count_opponent >= 2)
 * 3. If yes, that element "triggers" and appears in the potion
 * 4. If no elements trigger, the potion has "null effect"
 * 
 * Example: If you have 3 Sun elements and 1 Moon element:
 * - Sun count: 3, Moon count: 1
 * - Sun difference: 3 - 1 = 2 (>= 2, so Sun triggers)
 * - Moon difference: 1 - 3 = -2 (< 2, so Moon doesn't trigger)
 * - Result: Potion with Sun effect
 * 
 * @param ingredients - Array of ingredients to brew together
 * @returns The brewing result with effects and null status
 */
export function brew(ingredients: Ingredient[]): BrewResult {
  // Step 1: Count occurrences of each element across all ingredients
  const counts: Record<Element, number> = ALL_ELEMENTS.reduce((acc, e) => {
    acc[e] = 0;  // Initialize all counts to 0
    return acc;
  }, {} as Record<Element, number>);

  // Count each element in each ingredient
  ingredients.forEach((ing) => ing.elements.forEach((e) => (counts[e] += 1)));

  // Step 2: Determine which elements trigger
  const effects: Element[] = [];
  for (const e of ALL_ELEMENTS) {
    const opp = OPPONENT[e];  // Get the opposing element
    // Element triggers if it outnumbers its opponent by 2 or more
    if (counts[e] - counts[opp] >= 2) {
      // Make sure we don't add the opponent (they can't both trigger)
      if (!effects.includes(opp)) effects.push(e);
    }
  }
  
  // Step 3: Sort effects by display order and return result
  effects.sort((a, b) => ORDER_INDEX[a] - ORDER_INDEX[b]);
  return { effects, isNull: effects.length === 0 };
}

// ===== GAME GENERATION =====
// Creates new games with ingredients and puzzles

/**
 * Configuration schema for game generation
 * Uses Zod for runtime validation of configuration options
 */
const GenConfigSchema = z.object({
  seed: z.string(),                                    // Seed for reproducible generation
  daily: z.boolean().default(false),                   // Whether this is a daily puzzle
  maxCombo: z.number().int().min(2).max(4).default(4), // Max ingredients per brew (2-4)
  elementsPerIngredient: z.literal(3),                // Always exactly 3 elements per ingredient
  minIngredients: z.number().int().min(4).default(8),  // Minimum ingredients in game
  maxIngredients: z.number().int().min(8).default(14), // Maximum ingredients in game
});

/** TypeScript type derived from the Zod schema */
export type GenConfig = z.infer<typeof GenConfigSchema>;

/**
 * Generates fantasy-style ingredient names
 * Uses a syllable-based system to create pronounceable names
 * Format: [prefix][vowel][suffix] (e.g., "Arleaf", "Belbloom")
 * 
 * @param idx - Index of the ingredient (determines which syllables to use)
 * @returns A fantasy ingredient name
 */
export function makeIngredientName(idx: number): string {
  // Three arrays of syllables for creating names
  const syllA = ["Ar", "Bel", "Cyn", "Dra", "Eld", "Fae", "Gry", "Hex", "Iri", "Jyn", "Kal", "Lum", "Myr", "Nyx", "Ori", "Py", "Qua", "Ryn", "Syl", "Tor", "Umb", "Vex", "Wyr", "Xil", "Yor", "Zin"];
  const syllB = ["a", "e", "i", "o", "u", "ae", "ia", "oi", "ou", "au"]; 
  const syllC = ["leaf", "bloom", "root", "dust", "stone", "ash", "scale", "petal", "moss", "thorn", "ember", "dew", "horn", "fang", "bark", "spore", "bud", "pith", "sepal", "gale", "flare", "tide", "glow", "shade", "howl", "hush"];
  
  // Cycle through arrays using modulo to ensure variety
  return `${syllA[idx % syllA.length]}${syllB[idx % syllB.length]} ${syllC[idx % syllC.length]}`;
}

/**
 * Checks if an element can be added to an ingredient
 * An element can be added if:
 * 1. It's not already in the ingredient
 * 2. Its opponent is not already in the ingredient
 * 
 * This ensures ingredients never contain opposing pairs
 * 
 * @param current - Current elements in the ingredient
 * @param e - Element to potentially add
 * @returns True if the element can be added
 */
export function canAddElementToIngredient(current: Element[], e: Element): boolean {
  if (current.includes(e)) return false;  // Already present
  // Check if any current element opposes the new element
  return !current.some((x) => OPPONENT[x] === e || OPPONENT[e] === x);
}

/**
 * Generates a random ingredient with exactly 3 elements
 * Uses a two-step process:
 * 1. Try to add elements from a shuffled pool (preferred method)
 * 2. If that fails, randomly add elements until we have 3
 * 
 * @param rnd - Random number generator function
 * @returns Array of exactly 3 elements (no opposing pairs)
 */
export function randomIngredient(rnd: () => number): Element[] {
  const els: Element[] = [];
  
  // Step 1: Try adding elements from shuffled pool
  const pool = shuffle(ALL_ELEMENTS, rnd);
  for (const e of pool) {
    if (canAddElementToIngredient(els, e)) {
      els.push(e);
      if (els.length === 3) break;  // We have enough elements
    }
  }
  
  // Step 2: If we don't have 3 elements, randomly add more
  while (els.length < 3) {
    const e = choose(ALL_ELEMENTS, rnd);
    if (canAddElementToIngredient(els, e)) els.push(e);
  }
  
  return els;
}

export function hasBasicPotionFor(target: Element, ingredients: Ingredient[], maxCombo: number): boolean {
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
    specificPotion: Element[];
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
    const specificPotion = chosen.effects;
    const minSizeForTarget = chosen.size;

    return { cfg, seed: cfg.seed, ingredients, profileHuntTarget, fullMappingProfiles, specificPotion, minSizeForTarget };
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
