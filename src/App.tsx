/**************************************
 * POTION PUZZLE — MAIN APPLICATION
 * ==================================
 * 
 * This is the root component of the Potion Puzzle application.
 * It handles:
 * - Application routing (different game modes)
 * - Game initialization and persistence
 * - Self-test execution
 * - Overall app layout and structure
 * 
 * ARCHITECTURE:
 * - Uses React Router for navigation between game modes
 * - MemoryRouter avoids Content Security Policy issues
 * - AppShell handles initialization and routing
 * - Each game mode is a separate component
 **************************************/

import React, { useEffect } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useGame } from "./store";
import type { Mode } from "./types";
import { Header } from "./components/Header";
import { SpecificPotionMode } from "./components/modes/SpecificPotionMode";
import { ProfileHuntMode } from "./components/modes/ProfileHuntMode";
import { FullMappingMode } from "./components/modes/FullMappingMode";
import { runSelfTests } from "./tests";

// ===== MAIN APPLICATION COMPONENT =====

/**
 * AppShell Component
 * 
 * This is the main application wrapper that:
 * 1. Initializes the game on startup
 * 2. Handles localStorage persistence
 * 3. Runs self-tests
 * 4. Provides the main layout and routing
 */
const AppShell: React.FC = () => {
  const { newGame } = useGame();
  
  // ===== GAME INITIALIZATION =====
  // Runs once when the app starts up
  useEffect(() => {
    // Try to load saved game state from localStorage
    const saved = localStorage.getItem("potion-puzzle-state");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Safely parse the saved data with type checking
        const safe = {
          seed: typeof parsed?.seed === "string" ? parsed.seed : undefined,
          daily: typeof parsed?.daily === "boolean" ? parsed.daily : undefined,
          mode: typeof parsed?.mode === "string" ? parsed.mode : undefined,
        } as { seed?: string; daily?: boolean; mode?: Mode };
        
        // Start a new game with the saved settings
        newGame(safe);
        return;
      } catch {
        // If parsing fails, fall through to default game
      }
    }
    
    // If no saved game or parsing failed, start a daily puzzle
    newGame({ daily: true });
  }, []);

  // ===== SELF-TEST EXECUTION =====
  // Runs the built-in tests to verify game logic
  useEffect(() => {
    runSelfTests();
  }, []);

  // ===== MAIN APP LAYOUT =====
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header with navigation and game controls */}
      <Header />
      
      {/* Main content area with routing */}
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        <Routes>
          {/* Route definitions for different game modes */}
          <Route path="/" element={<SpecificPotionMode />} />
          <Route path="/specific-potion" element={<SpecificPotionMode />} />
          <Route path="/profile-hunt" element={<ProfileHuntMode />} />
          <Route path="/full-mapping" element={<FullMappingMode />} />
        </Routes>
      </div>
    </div>
  );
};

// ===== APP EXPORT =====

/**
 * Main App Component
 * 
 * Wraps the AppShell in a MemoryRouter to handle navigation.
 * MemoryRouter is used instead of BrowserRouter to avoid Content Security Policy issues
 * in some deployment environments.
 */
export default function App() {
  return (
    <MemoryRouter initialEntries={["/specific-potion"]}>
      <AppShell />
    </MemoryRouter>
  );
}
