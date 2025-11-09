/**************************************
 * POTION PUZZLE — GAME STATE MANAGEMENT
 * =====================================
 * 
 * This file uses Zustand to manage the global game state.
 * Zustand is a lightweight state management library that provides:
 * - Simple, unopinionated state management
 * - No boilerplate (no providers, reducers, etc.)
 * - TypeScript support out of the box
 * 
 * GAME STATE INCLUDES:
 * - Game configuration (seed, mode, ingredients)
 * - Player progress (marks, brew log, statistics)
 * - UI state (debug mode, win status)
 * - Actions for modifying state
 **************************************/

import { create } from "zustand";
import { generateGame, brew, sameSet, elementsFromMarks } from "./utils";
import { PAIRS, ORDER_INDEX } from "./types";
import type { Element, Ingredient, BrewResult, Mode, GridStateCell } from "./types";

// ===== GAME STATE TYPE DEFINITION =====
// Defines all the data and actions that make up the game state

/**
 * Complete game state interface
 * Contains all data needed to represent a game session
 */
type GameState = {
  // ===== GAME CONFIGURATION =====
  seed: string;                    // Seed for reproducible game generation
  daily: boolean;                 // Whether this is a daily puzzle
  mode: Mode;                     // Current game mode (target-order, profile-hunt, full-mapping)
  
  // ===== INGREDIENTS & PUZZLE DATA =====
  ingredients: Ingredient[];       // All available ingredients in this game
  marks: Record<string, Record<string, GridStateCell>>; // Player's deduction marks
  brewLog: { ids: string[]; result: BrewResult }[]; // History of brewing attempts
  
  // ===== GAME STATISTICS =====
  startedAt: number;              // Timestamp when game started
  potionsBrewed: number;          // Total number of brewing attempts
  nullCount: number;              // Number of null-effect potions brewed
  
  // ===== PUZZLE TARGETS =====
  specificPotion: Element[];       // Target effects for target-order mode
  profileHuntTarget: Ingredient;  // Target ingredient for profile-hunt mode
  fullMappingProfiles: { id: string; elements: Element[] }[]; // All profiles for full-mapping mode
  
  // ===== GAME CONSTRAINTS =====
  maxCombo: number;               // Maximum ingredients per brew (usually 4)
  
  // ===== GAME STATUS =====
  isWon: boolean;                 // Whether the player has won
  submitFailures: number;          // Number of failed submissions
  lastSubmitOk: boolean;          // Whether the last submission was correct
  
  // ===== UI STATE =====
  debug: boolean;                 // Whether debug mode is enabled
  
  // ===== ACTIONS =====
  // Functions that modify the game state
  newGame: (opts: { seed?: string; daily?: boolean; mode?: Mode }) => void;
  toggleMark: (ingredientId: string, pairIdx: number) => void;
  brewSelection: (ids: string[]) => BrewResult;
  setDebug: (v: boolean) => void;
  submitGrid: (mode: Exclude<Mode, "target-order">) => void;
};

// ===== ZUSTAND STORE IMPLEMENTATION =====
// Creates the global game state store using Zustand

/**
 * Global game state store
 * 
 * Zustand's `create` function takes a callback that receives:
 * - `set`: Function to update state
 * - `get`: Function to read current state
 * 
 * Returns a hook that components can use to access and modify state
 */
export const useGame = create<GameState>((set, get) => ({
  // ===== INITIAL STATE VALUES =====
  // These are the default values when the store is first created
  
  seed: "",                    // Empty seed initially
  daily: false,                // Not a daily puzzle by default
  mode: "target-order",        // Start in target-order mode
  ingredients: [],              // No ingredients initially
  marks: {},                   // No deduction marks initially
  brewLog: [],                 // No brewing history initially
  startedAt: Date.now(),       // Current timestamp
  potionsBrewed: 0,            // No potions brewed yet
  nullCount: 0,                // No null potions yet
  specificPotion: [],           // No target potion initially
  profileHuntTarget: { id: "-1", name: "", elements: ["Sun", "Air", "Water"] }, // Dummy target
  fullMappingProfiles: [],     // No profiles initially
  maxCombo: 4,                 // Maximum 4 ingredients per brew
  isWon: false,                // Game not won initially
  submitFailures: 0,           // No failed submissions yet
  lastSubmitOk: false,         // No submissions yet
  debug: false,                // Debug mode off initially
  // ===== ACTION FUNCTIONS =====
  // These functions modify the game state when called
  
  /**
   * NEW GAME ACTION
   * 
   * Creates a completely new game with fresh ingredients and puzzle.
   * This is the main way to start or restart a game.
   * 
   * Process:
   * 1. Generate new ingredients and puzzle using the provided seed
   * 2. Initialize deduction marks for all ingredients
   * 3. Reset all game statistics and state
   * 4. Save game state to localStorage for persistence
   * 
   * @param opts - Game options (seed, daily flag, mode)
   */
  newGame: ({ seed, daily, mode }) => {
    // Generate a new game with exactly 8 ingredients
    const gen = generateGame({ seed, daily, maxCombo: 4, minIngredients: 8, maxIngredients: 8 });
    
    // Initialize deduction marks for all ingredients
    // Each ingredient gets a mark for each element pair (4 pairs total)
    const marks: GameState["marks"] = {};
    for (const ing of gen.ingredients) {
      marks[ing.id] = {};
      PAIRS.forEach((_, idx) => (marks[ing.id][String(idx)] = "Unknown"));
    }
    
    // Update the entire game state with new data
    set({
      seed: gen.seed,
      daily: !!daily,
      mode: mode ?? get().mode,  // Keep current mode if not specified
      ingredients: gen.ingredients,
      marks,
      brewLog: [],                // Clear brewing history
      startedAt: Date.now(),     // Reset start time
      potionsBrewed: 0,          // Reset counters
      nullCount: 0,
      specificPotion: gen.specificPotion,
      profileHuntTarget: gen.profileHuntTarget,
      fullMappingProfiles: gen.fullMappingProfiles,
      maxCombo: 4,
      isWon: false,              // Reset win status
      submitFailures: 0,         // Reset failure count
      lastSubmitOk: false,       // Reset submission status
      debug: false,              // Turn off debug mode
    });
    
    // Save game state to localStorage for persistence
    // This allows the game to resume after page refresh
    try {
      localStorage.setItem(
        "potion-puzzle-state",
        JSON.stringify({ seed: gen.seed, daily: !!daily, mode: mode ?? get().mode })
      );
    } catch {
      // Ignore localStorage errors (e.g., in private browsing)
    }
  },
  /**
   * TOGGLE MARK ACTION
   * 
   * Cycles through the possible deduction states for an ingredient's element pair.
   * This is how players mark their deductions in the deduction grid.
   * 
   * The cycle goes: Unknown → Left Element → Right Element → None → Not Left → Not Right → Unknown
   * 
   * @param ingredientId - ID of the ingredient to mark
   * @param pairIdx - Index of the element pair (0-3, corresponding to PAIRS array)
   */
  toggleMark: (ingredientId, pairIdx) => {
    const st = get();
    const current = st.marks[ingredientId][String(pairIdx)];
    const [left, right] = PAIRS[pairIdx];
    
    // Define the cycle of possible marks
    const cycle: GridStateCell[] = ["Unknown", left, right, "None", "NotLeft", "NotRight"];
    
    // Find next mark in the cycle
    const next = cycle[(cycle.indexOf(current) + 1) % cycle.length];
    
    // Update the mark for this ingredient and pair
    set({ 
      marks: { 
        ...st.marks, 
        [ingredientId]: { 
          ...st.marks[ingredientId], 
          [String(pairIdx)]: next 
        } 
      } 
    });
  },
  brewSelection: (ids) => {
    const st = get();
    if (ids.length < 2 || ids.length > st.maxCombo) return { effects: [], isNull: true };
    const ings = ids.map((id) => st.ingredients.find((x) => x.id === id)!).filter(Boolean);
    const res = brew(ings);
    if (!res.isNull && st.mode === "target-order") {
      const ok = sameSet(res.effects, st.specificPotion) && res.effects.length === st.specificPotion.length;
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
