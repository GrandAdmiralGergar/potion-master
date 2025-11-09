import React from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../store";
import { Pill } from "./UI";

export const Header: React.FC = () => {
  const { seed, daily, newGame, mode } = useGame();
  const [seedInput, setSeedInput] = React.useState("");
  const nav = useNavigate();
  return (
    <div className="flex items-center justify-between gap-4 p-4 border-b bg-white sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div className="text-xl font-semibold">Potion Puzzle</div>
        <Pill>Mode: {mode}</Pill>
        <Pill>Seed: {seed}</Pill>
        {daily && <Pill>Daily</Pill>}
      </div>
      <div className="flex items-center gap-2">
        <button className="px-3 py-1 rounded-lg border shadow-sm" onClick={() => newGame({ daily: true })}>Daily</button>
        <input placeholder="custom seed" className="px-2 py-1 border rounded-lg w-40" value={seedInput} onChange={(e) => setSeedInput(e.target.value)} />
        <button className="px-3 py-1 rounded-lg border shadow-sm" onClick={() => newGame({ seed: seedInput || undefined })}>New Game</button>
        <select className="px-2 py-1 border rounded-lg" value={mode} onChange={(e) => { const next = String(e.target.value || "target-order"); nav(`/${next}`); newGame({}); }}>
          <option value="profile-hunt">Profile Hunt</option>
          <option value="full-mapping">Full Mapping</option>
          <option value="target-order">Target Order</option>
        </select>
      </div>
    </div>
  );
};
