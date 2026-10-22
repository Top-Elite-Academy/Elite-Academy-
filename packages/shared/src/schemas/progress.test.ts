import { describe, expect, it } from 'vitest';
import { progressStatus } from './progress';

describe('progressStatus', () => {
  it('needs at least three marked classes', () => {
    expect(progressStatus(0, 2)).toBeNull();
  });

  it('is on track from 85%, behind from 70%, at risk below', () => {
    expect(progressStatus(17, 20)).toBe('on_track');
    expect(progressStatus(16, 20)).toBe('behind');
    expect(progressStatus(14, 20)).toBe('behind');
    expect(progressStatus(13, 20)).toBe('at_risk');
  });
});
