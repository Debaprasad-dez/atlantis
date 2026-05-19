import { create } from 'zustand';

/**
 * UI / shell state — left nav width, command palette open state, theme, region.
 */
export const useUIStore = create((set) => ({
  leftNavCollapsed: false,
  rightInspectorOpen: true,
  paletteOpen: false,
  theme: 'dark', // 'dark' | 'light'
  region: null,  // null = global, else { code, name, bounds, center, zoom }
  toggleLeftNav: () => set((s) => ({ leftNavCollapsed: !s.leftNavCollapsed })),
  toggleRightInspector: () => set((s) => ({ rightInspectorOpen: !s.rightInspectorOpen })),
  setPaletteOpen: (open) => set({ paletteOpen: open }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  setRegion: (region) => set({ region }),
}));
