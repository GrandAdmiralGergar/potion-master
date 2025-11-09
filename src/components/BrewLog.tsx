import React from "react";
import { useGame } from "../store";
import { EffectBadge } from "./UI";
import { X } from "lucide-react";

export const BrewLog: React.FC = () => {
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
