import type { TourStep } from "./types";

type Listener = () => void;
let current: { steps: TourStep[]; title: string } | null = null;
const listeners = new Set<Listener>();

export function startTour(steps: TourStep[], title: string) {
  current = { steps, title };
  listeners.forEach((l) => l());
}
export function stopTour() {
  current = null;
  listeners.forEach((l) => l());
}
export function subscribeTour(l: Listener) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
export function getTour() {
  return current;
}
