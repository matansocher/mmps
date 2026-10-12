import type { GameState } from '../src/game/types';

export type RoomDesign = { readonly id: number; readonly insight: string; readonly required: (state: GameState) => boolean };

function at(state: GameState, x: number, y: number): number {
  return y * state.board.width + x;
}

export const ROOM_DESIGNS: readonly RoomDesign[] = [
  { id: 202, insight: 'Place a barrel at the end of an otherwise unbrakeable approach to a side exit.', required: (state) => state.crates.includes(at(state, 5, 3)) },
  {
    id: 203,
    insight: 'Use a temporary brake to turn cargo off ice, then move that brake to create the player landing.',
    required: (state) => state.crates.includes(at(state, 5, 1)) && state.crates.includes(at(state, 8, 3)),
  },
  { id: 204, insight: 'Route through a network of dry islands; the outward and return approaches use different axes.', required: (state) => state.player === at(state, 4, 5) },
  { id: 206, insight: 'Line up the cargo before committing to a one-use crossing, then change the pushing axis on the far bank.', required: (state) => state.crates.includes(at(state, 5, 3)) },
  { id: 207, insight: 'Approach the apparent obstruction from the far side; collect the key before both crossings disappear.', required: (state) => state.crates.includes(at(state, 1, 1)) },
  {
    id: 208,
    insight: 'Find a self-avoiding collection route through fragile junctions, reserving the final approach to three locks.',
    required: (state) => state.collectedKeys.length === 3 && state.player === at(state, 3, 5),
  },
  { id: 210, insight: 'Cross on one axis, dismount, and use a shore path to return on the other axis.', required: (state) => state.player === at(state, 2, 3) && state.collectedKeys.length === 1 },
  { id: 211, insight: 'Use the horizontal bridge for cargo, empty it, and restore its vertical axis for the final route.', required: (state) => state.crates.includes(at(state, 4, 3)) },
  {
    id: 212,
    insight: 'Cycle a bridge through three orientations: reach the far side, retrieve cargo backwards, then leave by the original bank.',
    required: (state) => state.crates.includes(at(state, 1, 3)) && state.flippedBridges.includes(at(state, 4, 3)),
  },
  {
    id: 213,
    insight: 'A tempting turntable is unusable while occupied; send the barrel beyond it and route it back around on dry ground.',
    required: (state) => state.crates.includes(at(state, 6, 2)),
  },
  {
    id: 215,
    insight: 'Cargo uses the outgoing lane; its keeper must return through the opposing lane.',
    required: (state) => state.crates.includes(at(state, 7, 3)) && state.player === at(state, 4, 1),
  },
  { id: 216, insight: 'Push beyond the first landing so the player can leave a directed tile and approach the cargo sideways.', required: (state) => state.crates.includes(at(state, 4, 1)) },
  {
    id: 217,
    insight: 'Coordinate two deliveries through a directed circulation loop; the second job must not strand the first.',
    required: (state) => state.crates.includes(at(state, 7, 5)) && state.player === at(state, 5, 4),
  },
  { id: 219, insight: 'Use one polarity to enter a directed circuit and the other to leave it, switching from the far side.', required: (state) => state.collectedKeys.length === 1 && !state.leverOn },
  {
    id: 220,
    insight: 'Stage cargo beyond the first gate before switching polarity and re-entering through an alternate passage.',
    required: (state) => state.crates.includes(at(state, 6, 3)) && !state.leverOn,
  },
  {
    id: 221,
    insight: 'Use a temporary pressure circuit to reach persistent control, then reclaim its barrel for a different circuit.',
    required: (state) => state.leverOn && state.crates.includes(at(state, 5, 3)),
  },
  {
    id: 222,
    insight: 'Keep a gate closed as an ice brake; only open it after the stopped cargo has changed direction.',
    required: (state) => !state.leverOn && state.crates.includes(at(state, 5, 3)),
  },
  {
    id: 224,
    insight: 'Separate the cargo route from the crew route, including the forced return when unloading a tunnel mouth.',
    required: (state) => state.player === at(state, 3, 3) && state.crates.includes(at(state, 7, 2)),
  },
  {
    id: 225,
    insight: 'After a one-use outbound route, deliberately block the far mouth so entering the near mouth no longer teleports the player.',
    required: (state) => state.crates.includes(at(state, 8, 1)) && state.player === at(state, 3, 3) && state.collectedKeys.length === 1,
  },
  {
    id: 226,
    insight: 'Unload the first barrel upward to unlock the lateral working position needed by the second shipment.',
    required: (state) => state.crates.includes(at(state, 6, 1)) && state.player === at(state, 5, 3),
  },
  {
    id: 227,
    insight: 'Reach the receiving side in one polarity, change it from inside, and exploit the tunnel return to finish the delivery.',
    required: (state) => state.leverOn && state.player === at(state, 5, 3) && state.crates.includes(at(state, 6, 3)),
  },
  { id: 229, insight: 'Route one beam through a three-mirror circuit that serves two receivers on different legs.', required: (state) => state.flippedMirrors.length === 3 },
  { id: 230, insight: 'A barrel must first obstruct the beam to open a working position, then leave the switch to restore the light.', required: (state) => state.crates.includes(at(state, 4, 2)) },
  {
    id: 231,
    insight: 'Use two weights as successive brakes on perpendicular ice runs, sending the second around a directed freight loop.',
    required: (state) => state.crates.includes(at(state, 4, 1)) && state.crates.includes(at(state, 4, 2)),
  },
  {
    id: 234,
    insight: 'Transfer one barrel through two temporary pressure circuits, latch a permanent return route, and finally remove it from the optical path.',
    required: (state) => state.leverOn && state.crates.includes(at(state, 5, 3)),
  },
];
