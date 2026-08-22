import { ActionNode, SelectorNode, SequenceNode } from "./core";

/**
 * World & Guard State
 */
interface WorldState {
  health: number;
  enemyInSight: boolean;
  ammo: number;
  lastAction: string;
}

const state: WorldState = {
  health: 100,
  enemyInSight: false,
  ammo: 3,
  lastAction: "None"
};

/**
 * Leaf Actions & Conditions
 */
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

/**
 * Assembling the Behavior Tree (Top-Down)
 *
 * Guard Priority (Selector):
 *   1. Flee Branch (Sequence: Health Low -> Enemy In Sight -> Flee)
 *   2. Combat Branch (Sequence: Enemy In Sight -> Choose Attack (Selector: Ranged vs Melee))
 *   3. Idle / Patrol Branch (Action: Patrol)
 */
const fleeSequence = new SequenceNode("Sequence: Flee if Low HP", [
  isHealthLow,
  isEnemyInSight,
  flee
]);

const rangedSequence = new SequenceNode("Sequence: Shoot if Ammo", [
  hasAmmo,
  shootArrow
]);

const attackSelector = new SelectorNode("Selector: Choose Attack Mode", [
  rangedSequence,
  meleeAttack
]);

const combatSequence = new SequenceNode("Sequence: Engage Enemy", [
  isEnemyInSight,
  attackSelector
]);

const guardBehaviorTree = new SelectorNode("Root: Guard AI", [
  fleeSequence,
  combatSequence,
  patrol
]);

// -------------------------------------------------------------
// Interactive Simulation: Ticking the tree under dynamic events
// -------------------------------------------------------------

console.log("=== BEHAVIOR TREE NPC SIMULATION ===\n");

function tickSimulation(stepName: string, setup: () => void) {
  setup();
  console.log(`--- ${stepName} ---`);
  console.log(`State: Health=${state.health}, Enemy=${state.enemyInSight}, Ammo=${state.ammo}`);
  const result = guardBehaviorTree.tick();
  console.log(`Result: ${state.lastAction} (Tree Status: ${result})\n`);
}

// Tick 1: Peaceful day
tickSimulation("Tick 1: Peaceful Guard Duty", () => {
  state.health = 100;
  state.enemyInSight = false;
  state.ammo = 3;
});

// Tick 2: Enemy spotted at distance
tickSimulation("Tick 2: Enemy Appears!", () => {
  state.enemyInSight = true;
});

// Tick 3: Enemy still here, guard shoots another arrow
tickSimulation("Tick 3: Continued Combat", () => {
  // ammo was 2, now will become 1
});

// Tick 4: Guard runs out of ammo (ammo = 0)
tickSimulation("Tick 4: Out of Ammo", () => {
  state.ammo = 0;
});

// Tick 5: Guard gets wounded severely (health drops to 10)
tickSimulation("Tick 5: Guard Takes Critical Damage!", () => {
  state.health = 10;
});

// Tick 6: Enemy disappears
tickSimulation("Tick 6: Threat Cleared", () => {
  state.enemyInSight = false;
});
