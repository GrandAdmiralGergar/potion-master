import React from "react";
import { useGame } from "../../store";
import { ORDER_INDEX } from "../../types";
import { BrewPanel } from "../../components/BrewPanel";
import { BrewLog } from "../../components/BrewLog";
import { DeductionGrid } from "../../components/DeductionGrid";
import { SuccessBanner, EffectBadge } from "../../components/UI";

export const ProfileHuntMode: React.FC = () => {
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
