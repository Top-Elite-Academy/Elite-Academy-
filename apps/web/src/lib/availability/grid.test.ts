import { describe, expect, it } from 'vitest';
import { bookedCells, cellKey, cellsToWindows, classCells, windowsToCells } from './grid';

describe('availability grid', () => {
  it('turns windows into hour cells and back, merging neighbouring hours', () => {
    const windows = [
      { weekday: 1, startTime: '16:00', endTime: '18:00' },
      { weekday: 5, startTime: '09:00', endTime: '10:00' },
    ];
    const cells = windowsToCells(windows);
    expect([...cells].sort()).toEqual(['1-16', '1-17', '5-9']);
    expect(cellsToWindows(cells)).toEqual(windows);

    cells.add(cellKey(1, 18));
    cells.add(cellKey(1, 21)); // the last row ends at 22:00
    expect(cellsToWindows(cells).filter((w) => w.weekday === 1)).toEqual([
      { weekday: 1, startTime: '16:00', endTime: '19:00' },
      { weekday: 1, startTime: '21:00', endTime: '22:00' },
    ]);
  });

  it('locks every hour a live class touches', () => {
    expect([...classCells([{ weekday: 0, startTime: '18:30', endTime: '20:00' }])]).toEqual([
      '0-18',
      '0-19',
    ]);
  });

  it('places booked sessions in their Jerusalem day and hour', () => {
    // Monday 2 November 2026, 14:00 UTC = 16:00 in Jerusalem (winter time).
    expect(bookedCells([{ startAt: '2026-11-02T14:00:00Z', studentFirstName: 'Maya' }])).toEqual(
      new Map([['1-16', 'Maya']]),
    );
  });
});
