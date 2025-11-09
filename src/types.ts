/**************************************
 * POTION PUZZLE — CORE TYPES & CONSTANTS
 * ======================================
 * 
 * This file defines the fundamental building blocks of the Potion Puzzle game.
 * It contains all the TypeScript types and constants that define how the game works.
 * 
 * GAME MECHANICS OVERVIEW:
 * - 8 magical elements organized into 4 opposing pairs
 * - Each ingredient contains exactly 3 elements (never opposing pairs)
 * - Brewing rule: An element triggers if (count(element) - count(opponent) >= 2)
 * - If no elements trigger, the potion has "null effect"
 * - Players use deduction to figure out ingredient compositions
 * 
 * GAME MODES:
 * 1. Target Order: Brew a specific combination of effects
 * 2. Profile Hunt: Find the ingredient matching a given profile
 * 3. Full Mapping: Determine all ingredient compositions
 **************************************/

// ===== ELEMENT SYSTEM =====
// The game uses 8 magical elements that exist in opposing pairs
// Each element can only appear with its opponent in brewing, never in ingredients

/** The 8 magical elements in the game */
export type Element =
  | "Sun"      // Light, warmth, energy
  | "Moon"     // Darkness, mystery, cycles  
  | "Air"      // Wind, freedom, movement
  | "Earth"    // Stability, strength, grounding
  | "Water"    // Flow, emotion, adaptability
  | "Fire"     // Passion, destruction, transformation
  | "Plant"    // Growth, nature, life
  | "Animal";  // Instinct, wildness, spirit

/** Array of all elements for iteration */
export const ALL_ELEMENTS: Element[] = [
  "Sun", "Moon", "Air", "Earth", 
  "Water", "Fire", "Plant", "Animal"
];

/** Maps each element to its opposing element */
export const OPPONENT: Record<Element, Element> = {
  Sun: "Moon",    // Light vs Darkness
  Moon: "Sun",    // Darkness vs Light
  Air: "Earth",   // Sky vs Ground
  Earth: "Air",    // Ground vs Sky
  Water: "Fire",   // Flow vs Destruction
  Fire: "Water",   // Destruction vs Flow
  Plant: "Animal", // Nature vs Wildness
  Animal: "Plant", // Wildness vs Nature
};

/** The 4 opposing pairs, used for the deduction grid */
export const PAIRS: [Element, Element][] = [
  ["Sun", "Moon"],     // Light/Dark pair
  ["Air", "Earth"],    // Sky/Ground pair
  ["Water", "Fire"],   // Flow/Destruction pair
  ["Plant", "Animal"], // Nature/Wildness pair
];

/** Consistent ordering for displaying elements in UI */
export const ORDER_INDEX: Record<Element, number> = {
  Sun: 0, Moon: 1, Air: 2, Earth: 3,
  Water: 4, Fire: 5, Plant: 6, Animal: 7,
};

// ===== INGREDIENT SYSTEM =====
// Ingredients are the building blocks of potions

/** Possible states for marking ingredients in the deduction grid */
export type Mark = 
  | "Unknown"    // Haven't figured out this pair yet
  | Element       // This element is present (Sun, Moon, etc.)
  | "None"        // Neither element in this pair is present
  | "NotLeft"     // Left element is NOT present (right might be)
  | "NotRight";   // Right element is NOT present (left might be)

/** An ingredient in the game */
export type Ingredient = {
  id: string;           // Unique identifier
  name: string;         // Display name (e.g., "Arleaf", "Belbloom")
  elements: Element[];  // Exactly 3 elements, no opposing pairs
};

// ===== BREWING SYSTEM =====
// Results of brewing ingredients together

/** The result of brewing ingredients together */
export type BrewResult = { 
  effects: Element[];  // Which elements triggered
  isNull: boolean;    // True if no elements triggered (null potion)
};

// ===== GAME MODES =====
// Different ways to play the puzzle

/** Available game modes */
export type Mode = 
  | "profile-hunt"   // Find ingredient matching given profile
  | "full-mapping"   // Determine all ingredient compositions  
  | "target-order";  // Brew specific combination of effects

// ===== DEDUCTION GRID =====
// The grid where players mark their deductions

/** A single cell in the deduction grid */
export type GridStateCell = Mark;
