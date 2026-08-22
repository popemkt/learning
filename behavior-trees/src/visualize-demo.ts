import { ActionNode, BTNode, NodeStatus, SelectorNode, SequenceNode } from "./core";
import { toAscii, toMermaid } from "./visualizer";

// Guard world state
const state = {
  health: 100,
  enemyInSight: false,
  ammo: 3,
  lastAction: "None"
};

// Build tree
const isHealthLow = new ActionNode("Condition: Is Health Low?", () => {
  return state.health < 20 ? "SUCCESS" : "FAILURE";
});

const isEnemyInSight = new ActionNode("Condition: Is Enemy In Sight?", () => {
  return state.enemyInSight ? "SUCCESS" : "FAILURE";
});

const hasAmmo = new ActionNode("Condition: Has Ammo?", () => {
  return state.ammo > 0 ? "SUCCESS" : "FAILURE";
});

const flee = new ActionNode("Action: Flee to safety", () => {
  state.lastAction = "🏃 Fleeing to safe room!";
  return "SUCCESS";
});

const shootArrow = new ActionNode("Action: Shoot Arrow", () => {
  state.ammo -= 1;
  state.lastAction = `🏹 Shooting arrow! (Ammo left: ${state.ammo})`;
  return "SUCCESS";
});

const meleeAttack = new ActionNode("Action: Melee Strike", () => {
  state.lastAction = "⚔️ Swinging broadsword at intruder!";
  return "SUCCESS";
});

const patrol = new ActionNode("Action: Patrol", () => {
  state.lastAction = "🚶 Patrolling castle courtyard peacefully...";
  return "SUCCESS";
});

const fleeSequence = new SequenceNode("Flee Branch", [
  isHealthLow,
  isEnemyInSight,
  flee
]);

const rangedSequence = new SequenceNode("Ranged Attack", [
  hasAmmo,
  shootArrow
]);

const attackSelector = new SelectorNode("Attack Mode", [
  rangedSequence,
  meleeAttack
]);

const combatSequence = new SequenceNode("Combat Branch", [
  isEnemyInSight,
  attackSelector
]);

const guardTree = new SelectorNode("Guard AI Root", [
  fleeSequence,
  combatSequence,
  patrol
]);

// 1. Render Static Tree (Structure Only)
console.log("========================================");
console.log("1. STATIC ASCII TREE STRUCTURE");
console.log("========================================");
console.log(toAscii(guardTree, { title: "Guard AI Behavior Tree" }));
console.log("\n");

// 2. Render Static Mermaid Diagram
console.log("========================================");
console.log("2. STATIC MERMAID DIAGRAM");
console.log("========================================");
console.log(toMermaid(guardTree));
console.log("\n");

// 3. Render Dynamic Execution Trace (When Enemy Appears)
console.log("========================================");
console.log("3. DYNAMIC EXECUTION TRACE (Enemy spotted, full HP)");
console.log("========================================");
state.health = 100;
state.enemyInSight = true;
state.ammo = 2;

const trace = new Map<BTNode, NodeStatus>();
const tickResult = guardTree.tick(trace);

console.log(`Tick Result: ${tickResult} | Action: ${state.lastAction}\n`);
console.log(toAscii(guardTree, { trace, title: "Execution Trace: Combat Active" }));
console.log("\n--- Mermaid with Execution Colors ---");
console.log(toMermaid(guardTree, { trace }));
