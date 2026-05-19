import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      leftNavCollapsed: false,
      rightInspectorOpen: true,
      paletteOpen: false,
    });
  });

  it('STORE-UI-01: defaults', () => {
    const s = useUIStore.getState();
    expect(s.leftNavCollapsed).toBe(false);
    expect(s.rightInspectorOpen).toBe(true);
    expect(s.paletteOpen).toBe(false);
  });

  it('STORE-UI-02: toggleLeftNav flips', () => {
    useUIStore.getState().toggleLeftNav();
    expect(useUIStore.getState().leftNavCollapsed).toBe(true);
  });

  it('STORE-UI-03: toggleRightInspector flips', () => {
    useUIStore.getState().toggleRightInspector();
    expect(useUIStore.getState().rightInspectorOpen).toBe(false);
  });

  it('STORE-UI-04: setPaletteOpen sets exact value', () => {
    useUIStore.getState().setPaletteOpen(true);
    expect(useUIStore.getState().paletteOpen).toBe(true);
    useUIStore.getState().setPaletteOpen(false);
    expect(useUIStore.getState().paletteOpen).toBe(false);
  });
});
