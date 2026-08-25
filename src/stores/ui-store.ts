import { createStore } from "zustand/vanilla";

export type UiStore = {
  mobileNavigationOpen: boolean;
  setMobileNavigationOpen: (open: boolean) => void;
};

export function createUiStore() {
  return createStore<UiStore>((set) => ({
    mobileNavigationOpen: false,
    setMobileNavigationOpen: (open) => set({ mobileNavigationOpen: open }),
  }));
}
