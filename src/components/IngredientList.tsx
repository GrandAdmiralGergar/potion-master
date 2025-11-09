import React from "react";
import { useGame } from "../store";
import { ORDER_INDEX } from "../types";
import { EffectBadge } from "./UI";

export const IngredientList: React.FC<{ select: string[]; setSelect: (ids: string[]) => void }> = ({ select, setSelect }) => {
  const { ingredients, debug, maxCombo } = useGame();

  const toggle = (id: string) => {
    const isSelected = select.includes(id);
    if (isSelected) {
      setSelect(select.filter((x) => x !== id));
    } else {
      if (select.length >= maxCombo) return; // cap selections
      setSelect([...select, id]);
    }
  };

  return (
    <div id="ingredient-list-grid" className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-auto">
      {ingredients.map((ing) => {
        const selected = select.includes(ing.id);
        const sortedEls = [...ing.elements].sort((a, b) => ORDER_INDEX[a] - ORDER_INDEX[b]);
        return (
          <button
            key={ing.id}
            onClick={() => toggle(ing.id)}
            className={`text-left p-3 rounded-2xl border shadow-sm flex items-start justify-between transition-colors cursor-pointer focus:outline-none focus:ring-2 ${
              selected ? "bg-indigo-50 border-indigo-400 ring-indigo-400" : "hover:bg-gray-50"
            }`}
          >
            <div>
              <div className="font-medium">{ing.name}</div>
              {debug && (
                <div className="mt-1 flex gap-1 flex-wrap">{sortedEls.map((e) => (<EffectBadge key={e} e={e} />))}</div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};