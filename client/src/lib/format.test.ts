import { describe, expect, it } from 'vitest';
import { formatBytes, formatRelative, formatRemaining, splitName } from './format';

describe('format', () => {
  it('formatBytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1,5 KB');
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
    expect(formatBytes(2.25 * 1024 ** 3)).toBe('2,3 GB');
    expect(formatBytes(150 * 1024 ** 2)).toBe('150 MB');
  });

  it('formatRelative', () => {
    const now = new Date('2026-11-13T10:00:00');
    expect(formatRelative('2026-11-13T09:59:50', now)).toBe('Vừa xong');
    expect(formatRelative('2026-11-13T09:40:00', now)).toBe('20 phút trước');
    expect(formatRelative('2026-11-13T07:00:00', now)).toBe('3 giờ trước');
    expect(formatRelative('2026-11-12T14:20:00', now)).toMatch(/^Hôm qua 14:20$/);
    expect(formatRelative('2026-10-01T08:00:00', now)).toBe('01/10/2026');
  });

  it('formatRemaining', () => {
    const now = new Date('2026-11-13T10:00:00');
    expect(formatRemaining('2026-11-13T09:00:00', now)).toBe('đã hết hạn');
    expect(formatRemaining('2026-11-13T10:30:00', now)).toBe('còn 30 phút');
    expect(formatRemaining('2026-11-14T10:00:00', now)).toBe('còn 24 giờ');
    expect(formatRemaining('2026-11-20T10:00:00', now)).toBe('còn 7 ngày');
  });

  it('splitName', () => {
    expect(splitName('Báo cáo.final.pdf')).toEqual({ base: 'Báo cáo.final', ext: 'pdf' });
    expect(splitName('.env')).toEqual({ base: '.env', ext: '' });
    expect(splitName('README')).toEqual({ base: 'README', ext: '' });
  });
});
