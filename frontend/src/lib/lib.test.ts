import { describe, expect, it } from 'vitest';
import { filenameFrom } from '../api/client';
import { LEVEL_HEADLINE, formatDate, formatDelta, formatScore, levelTone } from './maturity';
import { pentagon, percentPosition, radarVertices, vertex } from './pentagon';

describe('pentagon geometry', () => {
  it('places the first vertex straight above the centre', () => {
    const top = vertex(100, 100, 50, 0);
    expect(top.x).toBeCloseTo(100);
    expect(top.y).toBeCloseTo(50);
  });

  it('produces five SVG points', () => {
    expect(pentagon(0, 0, 10).split(' ')).toHaveLength(5);
  });

  it('maps scores between the inner and outer radius, clamped to 0-100', () => {
    const [zero, full, over] = radarVertices([0, 100, 150], 0, 0, 10, 110);
    expect(Math.hypot(zero.x, zero.y)).toBeCloseTo(10);
    expect(Math.hypot(full.x, full.y)).toBeCloseTo(110);
    expect(Math.hypot(over.x, over.y)).toBeCloseTo(110);
  });

  it('scales the radar shape with the animation progress', () => {
    const [half] = radarVertices([100], 0, 0, 10, 110, 0.5);
    expect(Math.hypot(half.x, half.y)).toBeCloseTo(60);
  });

  it('converts SVG coordinates to percentages', () => {
    expect(percentPosition({ x: 100, y: 50 }, 400, 200)).toEqual({ left: '25.00%', top: '25.00%' });
  });
});

describe('maturity presentation', () => {
  it('uses coral only for the critical level', () => {
    expect(levelTone('Critique')).toBe('var(--color-coral)');
    expect(levelTone('Faible')).toBe('var(--color-gold)');
    expect(levelTone('Avancé')).toBe('var(--color-emerald)');
  });

  it('agrees maturity headlines in the feminine', () => {
    expect(LEVEL_HEADLINE.Moyen).toBe('Maturité moyenne');
    expect(LEVEL_HEADLINE.Avancé).toBe('Maturité avancée');
  });

  it('rounds scores for display', () => {
    expect(formatScore(43.6)).toBe('44');
  });

  it('formats signed deltas and handles the first entry', () => {
    expect(formatDelta(55, 46)).toBe('+9');
    expect(formatDelta(40, 46)).toBe('-6');
    expect(formatDelta(40, undefined)).toBe('—');
  });

  it('formats ISO dates in French and tolerates invalid input', () => {
    expect(formatDate('2026-11-09T10:00:00+00:00')).toBe('9 novembre 2026');
    expect(formatDate('not-a-date')).toBe('—');
  });
});

describe('api helpers', () => {
  it('reads the PDF filename from Content-Disposition', () => {
    expect(filenameFrom('attachment; filename="rapport_pentascore_20261109.pdf"', 'x.pdf')).toBe(
      'rapport_pentascore_20261109.pdf',
    );
    expect(filenameFrom(null, 'x.pdf')).toBe('x.pdf');
  });
});
