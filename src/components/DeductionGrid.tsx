import React from "react";
import { Check, X } from "lucide-react";
import { useGame } from "../store";
import { PAIRS } from "../types";
import { EffectBadge, ElementIcon, NotBadge } from "./UI";

export const DeductionGrid: React.FC<{ showSubmit?: boolean; onSubmit?: () => void; submitLabel?: string }> = ({ showSubmit, onSubmit, submitLabel }) => {
  const { ingredients, marks, toggleMark } = useGame();
  return (
    <div className="overflow-auto border rounded-2xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left p-2">Ingredient</th>
            {PAIRS.map(([l, r], idx) => (
              <th key={idx} className="p-2 text-center min-w-40">
                <div className="flex items-center justify-center gap-2"><EffectBadge e={l} /><span className="text-gray-400">↔</span><EffectBadge e={r} /></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ingredients.map((ing) => (
            <tr key={ing.id} className="border-t">
              <td className="p-2 font-medium">{ing.name}</td>
              {PAIRS.map((pair, idx) => {
                const mark = marks[ing.id]?.[String(idx)] ?? "Unknown";
                const [left, right] = pair;
                return (
                  <td key={idx} className="p-2 text-center">
                    <button className="px-2 py-1 rounded-lg border w-full flex items-center justify-center gap-2" onClick={() => toggleMark(ing.id, idx)} title="Toggle mark">
                      {mark === "Unknown" && <span className="text-gray-400">?</span>}
                      {mark === "None" && (<span className="inline-flex items-center gap-1"><X size={14} /> None</span>)}
                      {mark === "NotLeft" && <NotBadge e={left} />}
                      {mark === "NotRight" && <NotBadge e={right} />}
                      {mark === left && (<span className="inline-flex items-center gap-1"><Check size={14} /><ElementIcon e={left} />{left}</span>)}
                      {mark === right && (<span className="inline-flex items-center gap-1"><Check size={14} /><ElementIcon e={right} />{right}</span>)}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between p-2">
        <div className="text-xs text-gray-500 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> ? Unknown</span>
          <span className="inline-flex items-center gap-1"><X size={12} /> None</span>
          <span className="inline-flex items-center gap-1"><Check size={12} /> Chosen element</span>
          <span className="inline-flex items-center gap-1"><X size={12} /> Not Left / Not Right</span>
        </div>
        {showSubmit && (
          <button className="px-3 py-1 rounded-lg border shadow-sm" onClick={onSubmit}>{submitLabel || "Submit"}</button>
        )}
      </div>
    </div>
  );
};
