export type LabMemory = {
  night: boolean;
  used: Set<string>;
  read: Set<number>;
  built: number;
  fridge: boolean;
  focusX: number | null;
};

function fresh(): LabMemory {
  return { night: false, used: new Set(), read: new Set(), built: 0, fridge: false, focusX: null };
}

let memory = fresh();

export function labMemory() {
  return memory;
}

export function forgetLab() {
  memory = fresh();
}
