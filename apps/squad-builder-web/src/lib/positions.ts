export type SlotType = 'GK' | 'LB' | 'CB' | 'RB' | 'CM' | 'LW' | 'ST' | 'RW';

export type Slot = {
  readonly id: string;
  readonly type: SlotType;
  // pitch coordinates, 0-100 (side = horizontal, line = vertical, 0 = own goal -> 100 = attack)
  readonly side: number;
  readonly line: number;
};

// Fixed 4-3-3: GK / LB CB CB RB / CM CM CM / LW ST RW
export const FORMATION: readonly Slot[] = [
  { id: 'gk', type: 'GK', side: 50, line: 0 },
  { id: 'lb', type: 'LB', side: 8, line: 25 },
  { id: 'cb1', type: 'CB', side: 35, line: 22 },
  { id: 'cb2', type: 'CB', side: 65, line: 22 },
  { id: 'rb', type: 'RB', side: 92, line: 25 },
  { id: 'cm1', type: 'CM', side: 22, line: 52 },
  { id: 'cm2', type: 'CM', side: 50, line: 50 },
  { id: 'cm3', type: 'CM', side: 78, line: 52 },
  { id: 'lw', type: 'LW', side: 12, line: 82 },
  { id: 'st', type: 'ST', side: 50, line: 88 },
  { id: 'rw', type: 'RW', side: 88, line: 82 },
];

// Map an EAFC position code to the formation slot type(s) it can fill.
const POSITION_TO_SLOTS: Record<string, SlotType[]> = {
  GK: ['GK'],
  CB: ['CB'],
  LB: ['LB'],
  LWB: ['LB'],
  RB: ['RB'],
  RWB: ['RB'],
  CDM: ['CM'],
  CM: ['CM'],
  CAM: ['CM'],
  LM: ['LW'],
  LW: ['LW'],
  RM: ['RW'],
  RW: ['RW'],
  ST: ['ST'],
  CF: ['ST'],
};

export function slotsForPosition(position: string): SlotType[] {
  return POSITION_TO_SLOTS[position] ?? [];
}
