import React from "react";
import { useGame } from "../../store";
import { BrewPanel } from "../../components/BrewPanel";
import { BrewLog } from "../../components/BrewLog";
import { DeductionGrid } from "../../components/DeductionGrid";
import { SuccessBanner } from "../../components/UI";

export const FullMappingMode: React.FC = () => {
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
