import { create } from "zustand";

export type MemoraAct = 1 | 2 | 3 | 4 | 5;

export type MemoraState = {
  currentAct: MemoraAct;
  /** During Act 2 reading: 0–3 cycle seasons via spread % 4. Value 3 also means “closing / winter veil”. */
  currentPage: number;
  studioWarm: boolean;
  bloomFlash: number;
  /** Open album spread index 0–5 (six pages / three openings). */
  bookSpreadIndex: number;
  morphProgress: number;
  cassetteInserted: boolean;
  tvPowered: boolean;
  reset: () => void;
  setAct: (act: MemoraAct) => void;
  setCurrentPage: (page: number) => void;
  setStudioWarm: (v: boolean) => void;
  setBloomFlash: (v: number) => void;
  setBookSpreadIndex: (i: number) => void;
  setMorphProgress: (n: number) => void;
  setCassetteInserted: (v: boolean) => void;
  setTvPowered: (v: boolean) => void;
  advanceBook: () => void;
  retreatBook: () => void;
  beginBookClose: () => void;
};

const initial = {
  currentAct: 1 as MemoraAct,
  currentPage: 0,
  studioWarm: false,
  bloomFlash: 0,
  bookSpreadIndex: 0,
  morphProgress: 0,
  cassetteInserted: false,
  tvPowered: false,
};

export const useMemoraStore = create<MemoraState>((set, get) => ({
  ...initial,
  reset: () => set({ ...initial }),
  setAct: (currentAct) => set({ currentAct }),
  setCurrentPage: (currentPage) => set({ currentPage }),
  setStudioWarm: (studioWarm) => set({ studioWarm }),
  setBloomFlash: (bloomFlash) => set({ bloomFlash }),
  setBookSpreadIndex: (bookSpreadIndex) => set({ bookSpreadIndex }),
  setMorphProgress: (morphProgress) => set({ morphProgress }),
  setCassetteInserted: (cassetteInserted) => set({ cassetteInserted }),
  setTvPowered: (tvPowered) => set({ tvPowered }),
  advanceBook: () => {
    const { bookSpreadIndex, currentAct } = get();
    if (currentAct !== 2) return;
    if (bookSpreadIndex >= 5) return;
    const next = bookSpreadIndex + 1;
    set({ bookSpreadIndex: next });
  },
  retreatBook: () => {
    const { bookSpreadIndex, currentAct } = get();
    if (currentAct !== 2) return;
    if (bookSpreadIndex <= 0) return;
    const next = bookSpreadIndex - 1;
    set({ bookSpreadIndex: next });
  },
  beginBookClose: () => {
    const { currentAct, bookSpreadIndex } = get();
    if (currentAct !== 2 || bookSpreadIndex !== 5) return;
    set({ currentPage: 3 });
  },
}));
