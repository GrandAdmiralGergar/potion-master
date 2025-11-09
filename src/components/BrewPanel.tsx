/**************************************
 * POTION PUZZLE — BREWING INTERFACE
 * ==================================
 * 
 * This component provides the main brewing interface where players:
 * 1. Select ingredients to brew together
 * 2. See expected outcomes based on their deductions
 * 3. Actually brew potions and see results
 * 4. Toggle debug mode to see ingredient compositions
 * 
 * KEY FEATURES:
 * - Ingredient selection with visual feedback
 * - Expected outcome prediction
 * - Debug mode for learning
 * - Brewing history and statistics
 **************************************/

import React, { useState } from "react";
import { useGame } from "../store";
import { expectedOutcomeForSelection } from "../utils";
import { IngredientList } from "./IngredientList";
import { EffectBadge } from "./UI";
import { X } from "lucide-react";
import type { BrewResult } from "../types";

/**
 * BrewPanel Component
 * 
 * The main brewing interface where players select ingredients and brew potions.
 * This is the core interaction component of the game.
 * 
 * FEATURES:
 * - Ingredient selection (2-4 ingredients)
 * - Expected outcome preview
 * - Actual brewing and result display
 * - Debug mode toggle
 * - Visual feedback for selections
 */
export const BrewPanel: React.FC = () => {
  // ===== STATE MANAGEMENT =====
  // Get game state and actions from the global store
  const { brewSelection, maxCombo, debug, setDebug, isWon, marks } = useGame();
  
  // Local state for ingredient selection and brewing results
  const [select, setSelect] = useState<string[]>([]);  // Currently selected ingredient IDs
  const [result, setResult] = useState<BrewResult | null>(null);  // Last brewing result
  
  // ===== DERIVED STATE =====
  // Calculate whether brewing is possible and expected outcomes
  const canBrew = select.length >= 2 && select.length <= maxCombo && !isWon;
  const expected = expectedOutcomeForSelection(select, marks);

  // ===== RENDER =====
  return (
    <div id="brew-panel" className="p-4 rounded-2xl border shadow-sm bg-white">
      {/* Header with instructions */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-semibold">Brew</div>
        <div className="text-sm text-gray-500">Pick 2–{maxCombo} ingredients</div>
      </div>
      
      {/* Debug mode toggle */}
      <div className="flex items-center gap-3 mb-3">
        <label className="flex items-center gap-2 text-sm">
          <input 
            type="checkbox" 
            checked={debug} 
            onChange={(e) => setDebug(e.target.checked)} 
          /> 
          Debug
        </label>
      </div>
      
      {/* Ingredient selection grid */}
      <IngredientList select={select} setSelect={setSelect} />
      
      {/* Brewing controls and feedback */}
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        {/* Brew button */}
        <button 
          className={`px-3 py-1 rounded-lg border shadow-sm ${
            canBrew ? "" : "opacity-50 cursor-not-allowed"
          }`} 
          disabled={!canBrew} 
          onClick={() => setResult(brewSelection(select))}
        >
          Brew Potion
        </button>
        
        {/* Expected outcome preview */}
        {select.length >= 2 && expected && (
          <div className="text-sm flex items-center gap-2">
            <span className="text-gray-600">Expected outcome:</span>
            <div className="flex items-center gap-1 flex-wrap">
              {/* Show expected effects */}
              {expected.effects.length > 0 && expected.effects.map((e) => (
                <EffectBadge key={`exp-${e}`} e={e} />
              ))}
              
              {/* Show null effect if expected */}
              {expected.effects.length === 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-gray-50">
                  <X size={14} /> Null Effect Potion
                </span>
              )}
              
              {/* Show ambiguity warning */}
              {expected.ambiguous && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs bg-gray-50">
                  Unknown
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* Actual brewing result */}
        {result && (
          <div className="flex items-center gap-2">
            {result.isNull ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border bg-gray-50">
                <X size={16} /> Null Effect Potion
              </span>
            ) : (
              <div className="flex items-center gap-2">
                {result.effects.map((e) => (
                  <EffectBadge key={e} e={e} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
