import { create } from "zustand";
import type { TimeWindow } from "@/lib/pixelpit";
import type { HunterState } from "@/lib/hunter-server";

export type PitView = "board" | "feed" | "submit";

type PitHandlers = {
  onConfirmTask: (id: string) => void;
  onSaveWallet: (address: string) => void;
};

type PitStore = {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  view: PitView;
  setView: (view: PitView) => void;
  window: TimeWindow;
  setWindow: (window: TimeWindow) => void;
  hunter: HunterState | null;
  busyId: string | null;
  handlers: PitHandlers | null;
  syncSession: (input: {
    hunter: HunterState | null;
    busyId: string | null;
    handlers: PitHandlers | null;
  }) => void;
};

export const usePitStore = create<PitStore>((set) => ({
  menuOpen: false,
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  view: "board",
  setView: (view) => set({ view }),
  window: "7d",
  setWindow: (window) => set({ window }),
  hunter: null,
  busyId: null,
  handlers: null,
  syncSession: (input) => set(input),
}));
