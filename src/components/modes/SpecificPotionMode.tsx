import React, { useMemo } from "react";
import { useGame } from "../../store";
import { findExactSolution } from "../../utils";
import { BrewPanel } from "../BrewPanel";
import { BrewLog } from "../BrewLog";
import { DeductionGrid } from "../DeductionGrid";
import { SuccessBanner, EffectBadge } from "../UI";

export const SpecificPotionMode: React.FC = () => {
  const { specificPotion, potionsBrewed, nullCount, isWon, debug, ingredients, maxCombo } = useGame();
  const solutionIds = useMemo(() => (debug ? findExactSolution(ingredients, specificPotion, maxCombo) : null), [debug, ingredients, specificPotion, maxCombo]);
  return (
    <div className="space-y-4">
      {isWon && <SuccessBanner />}
      <div className="p-4 rounded-2xl border shadow-sm bg-white">
        <div className="text-lg font-semibold mb-2">Objective</div>
        <div className="flex items-center gap-2 flex-wrap"><span>Craft exactly:</span>{specificPotion.map((e) => (<EffectBadge key={e} e={e} />))}</div>
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
