import { ALL_ELEMENTS, ORDER_INDEX, PAIRS } from "./types";
import type { Element, Ingredient, GridStateCell } from "./types";
import { brew, sameSet, elementsFromMarks, generateGame, findExactSolution, expectedOutcomeForSelection } from "./utils";

/************ Lightweight Self-Tests (console) ************/
export function runSelfTests() {
  if (typeof window === "undefined") return;
  const failures: string[] = [];
  const assert = (cond: boolean, msg: string) => { if (!cond) failures.push(msg); };

  // 0) ORDER_INDEX exists and sorts as intended
  const orderCheck = ["Plant","Sun","Water","Air","Animal","Moon","Earth","Fire"] as Element[];
  const orderSorted = [...orderCheck].sort((a,b)=>ORDER_INDEX[a]-ORDER_INDEX[b]);
  assert(orderSorted.join(",") === "Sun,Moon,Air,Earth,Water,Fire,Plant,Animal", "ORDER_INDEX sort baseline");

  // 1) Brew threshold
  const ing = (els: Element[]): Ingredient => ({ id: Math.random().toString(), name: "test", elements: els });
  let r = brew([ing(["Moon", "Air", "Water"]), ing(["Moon", "Earth", "Plant"])]);
  assert(!r.isNull && r.effects.includes("Moon"), "2 Moon vs 0 Sun should trigger Moon");
  r = brew([ing(["Moon", "Air", "Water"]), ing(["Moon", "Earth", "Plant"]), ing(["Sun", "Fire", "Animal"])]);
  assert(r.isNull || !r.effects.includes("Moon"), "2 Moon vs 1 Sun should NOT trigger Moon");

  // 2) sameSet helper
  assert(sameSet(["Sun","Water"],["Water","Sun"]) === true, "sameSet order-insensitive");
  assert(sameSet(["Sun"],["Sun","Water"]) === false, "sameSet length mismatch");

  // 3) elementsFromMarks requires exactly 3
  const fakeMarks = { "0": "Sun", "1": "Air", "2": "Water", "3": "NotLeft" } as Record<string, GridStateCell>;
  const elems = elementsFromMarks(fakeMarks, PAIRS);
  assert(Array.isArray(elems) && (elems as Element[]).length === 3, "elementsFromMarks returns 3 when exactly three chosen");

  // 4) Generator coverage (explicit 8 ingredients)
  const gen = generateGame({ seed: "test-seed", maxCombo: 4, minIngredients: 8, maxIngredients: 8 });
  const canMake = (target: Element) => {
    const ings = gen.ingredients; const n = ings.length;
    const check = (subset: number[]) => { if (subset.length < 2 || subset.length > 4) return false; const res = brew(subset.map((i) => ings[i])); return !res.isNull && res.effects.includes(target); };
    for (let size = 2; size <= Math.min(4, n); size++) {
      const stack: number[] = []; const rec = (start: number): boolean => { if (stack.length === size) return check(stack); for (let i = start; i < n; i++) { stack.push(i); if (rec(i + 1)) return true; stack.pop(); } return false; };
      if (rec(0)) return true;
    }
    return false;
  };
  for (const e of ALL_ELEMENTS) { assert(canMake(e), `Generator should allow basic potion for ${e}`); }

  // 5) Expected outcome logic
  // Case A: 2 Water known + 1 unknown => could be canceled by Fire -> ambiguous
  const idsA = ["A","B","C"]; const marksA: Record<string, Record<string, GridStateCell>> = { A: { "0": "Sun", "1": "Air", "2": "Water", "3": "None" }, B: { "0": "Moon", "1": "NotLeft", "2": "Water", "3": "None" }, C: {} } as any;
  const expA = expectedOutcomeForSelection(idsA, marksA)!; assert(expA.ambiguous === true, "Expected outcome should be ambiguous when unknown could subtract");
  // Case B: 3 Water known + 1 unknown => guaranteed Water
  const idsB = ["A","B","C","D"]; const marksB: Record<string, Record<string, GridStateCell>> = { A: { "0": "Sun", "1": "Air", "2": "Water", "3": "None" }, B: { "0": "Moon", "1": "NotLeft", "2": "Water", "3": "None" }, C: { "0": "NotRight", "1": "None", "2": "Water", "3": "None" }, D: {} } as any;
  const expB = expectedOutcomeForSelection(idsB, marksB)!; assert(expB.certain.has("Water"), "Expected outcome should guarantee Water with 3 Water vs any unknown");

  // 6) Target order must be solvable
  const sol = findExactSolution(gen.ingredients, gen.specificPotion, 4);
  assert(!!sol, "Generated specificPotion should always have at least one exact solution");

  // 7) Brew should never return opposing effects simultaneously
  const sunHeavy = brew([ing(["Sun","Air","Water"]), ing(["Sun","Earth","Plant"]), ing(["Sun","Water","Plant"])]);
  assert(!(sunHeavy.effects.includes("Sun") && sunHeavy.effects.includes("Moon")), "Brew cannot include both an element and its opponent");

  // 8) Brew results are sorted by ORDER_INDEX
  const sortedCheck = brew([ing(["Moon","Air","Water"]), ing(["Moon","Earth","Plant"])]);
  const expectedSorted = [...sortedCheck.effects].sort((a,b)=>ORDER_INDEX[a]-ORDER_INDEX[b]).join(",");
  assert(sortedCheck.effects.join(",") === expectedSorted, "Brew effects should be ORDER_INDEX sorted");

  // 9) Target Order has a valid solution within maxCombo (soft check)
  const genPref = generateGame({ seed: "pref-3", maxCombo: 4, minIngredients: 8, maxIngredients: 8 });
  const solPref = findExactSolution(genPref.ingredients, genPref.specificPotion, 4);
  assert(!!solPref && solPref.length >= 2 && solPref.length <= 4, "Target order has a valid solution within maxCombo");

  // 10) Expected outcome with fully known ingredients equals actual brew
  const sampleIds = gen.ingredients.slice(0, 2).map(i => i.id);
  const marksKnown: Record<string, Record<string, GridStateCell>> = {};
  for (const ing of gen.ingredients.slice(0, 2)) {
    const m: Record<string, GridStateCell> = {};
    PAIRS.forEach((pair, idx) => {
      const [left, right] = pair;
      if (ing.elements.includes(left)) m[String(idx)] = left;
      else if (ing.elements.includes(right)) m[String(idx)] = right;
      else m[String(idx)] = "None";
    });
    marksKnown[ing.id] = m;
  }
  const eo = expectedOutcomeForSelection(sampleIds, marksKnown)!;
  const actual = brew(gen.ingredients.slice(0,2));
  assert(!eo.ambiguous && sameSet(eo.effects, actual.effects), "Expected outcome should match actual brew when all chosen are known");

  if (failures.length) {
    console.warn("Self-tests FAILED:\n" + failures.map((f) => " - " + f).join("\n"));
  } else {
    console.log("Self-tests passed ✓");
  }
}
