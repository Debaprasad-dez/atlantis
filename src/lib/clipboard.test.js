import { describe, it, expect, vi, afterEach } from 'vitest';
import { copyText } from './clipboard';

describe('copyText', () => {
  afterEach(() => {
    // Restore navigator.clipboard if mocked
    delete navigator.clipboard;
  });

  it('CLIP-01: uses navigator.clipboard when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const ok = await copyText('hello');
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('CLIP-02: falls back to execCommand when clipboard API throws', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new Error('denied')) },
      configurable: true,
    });
    // jsdom may not define document.execCommand; assign a fresh fn for the test.
    const execSpy = vi.fn().mockReturnValue(true);
    document.execCommand = execSpy;
    const ok = await copyText('fallback');
    expect(ok).toBe(true);
    expect(execSpy).toHaveBeenCalledWith('copy');
  });
});
