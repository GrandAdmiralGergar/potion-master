/**************************************
 * POTION PUZZLE — UI COMPONENTS
 * ==============================
 * 
 * This file contains reusable UI components used throughout the application.
 * These are small, focused components that handle specific visual elements.
 * 
 * COMPONENTS INCLUDED:
 * - Pill: Small rounded badges for labels
 * - ElementIcon: Icons for each magical element
 * - EffectBadge: Displays an element with its icon
 * - NotBadge: Shows "Not [Element]" with strikethrough
 * - SuccessBanner: Victory message display
 **************************************/

import React from "react";
import { X, Sun, Moon, Leaf, Flame, Droplets, Mountain, Wind } from "lucide-react";
import type { Element } from "../types";

// ===== BASIC UI COMPONENTS =====

/**
 * Pill Component
 * 
 * A small, rounded badge used for displaying labels and status information.
 * Used throughout the app for things like "Mode: target-order", "Seed: abc123", etc.
 * 
 * @param children - Content to display inside the pill
 */
export const Pill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="px-2 py-0.5 rounded-full text-xs border shadow-sm">{children}</span>
);

// ===== ELEMENT DISPLAY COMPONENTS =====

/**
 * ElementIcon Component
 * 
 * Displays the appropriate icon for each magical element.
 * Uses Lucide React icons for most elements, with a custom emoji for Animal.
 * 
 * @param e - The element to display an icon for
 */
export function ElementIcon({ e }: { e: Element }) {
  const size = 16;
  const cls = "inline-block align-text-bottom mr-1";
  
  switch (e) {
    case "Sun":
      return <Sun className={cls} size={size} />;      // ☀️ Sun icon
    case "Moon":
      return <Moon className={cls} size={size} />;    // 🌙 Moon icon
    case "Air":
      return <Wind className={cls} size={size} />;    // 💨 Wind icon
    case "Earth":
      return <Mountain className={cls} size={size} />; // 🏔️ Mountain icon
    case "Water":
      return <Droplets className={cls} size={size} />; // 💧 Water droplets
    case "Fire":
      return <Flame className={cls} size={size} />;   // 🔥 Flame icon
    case "Plant":
      return <Leaf className={cls} size={size} />;    // 🍃 Leaf icon
    case "Animal":
      return <span className={cls} style={{ width: size, height: size }}>🐾</span>; // Paw print emoji
  }
}

/**
 * EffectBadge Component
 * 
 * Displays an element as a styled badge with its icon and name.
 * Used to show potion effects, ingredient elements, and target combinations.
 * 
 * @param e - The element to display
 */
export const EffectBadge: React.FC<{ e: Element }> = ({ e }) => (
  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs">
    <ElementIcon e={e} /> {e}
  </span>
);

/**
 * NotBadge Component
 * 
 * Displays "Not [Element]" with a strikethrough X icon.
 * Used in the deduction grid to show when an element is confirmed NOT present.
 * 
 * @param e - The element that is NOT present
 */
export function NotBadge({ e }: { e: Element }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs opacity-70">
      <X size={14} /> Not {e}
    </span>
  );
}

// ===== STATUS COMPONENTS =====

/**
 * SuccessBanner Component
 * 
 * Displays a green success message when the player wins the game.
 * Used across all game modes to show victory.
 */
export const SuccessBanner: React.FC = () => (
  <div className="p-3 rounded-xl border bg-green-50 text-green-900 flex items-center justify-center font-semibold">
    Success!
  </div>
);
