import { cleanHeader, normalizeItemKey } from './item-key';

describe('normalizeItemKey', () => {
  it('ignores letter case', () => {
    expect(normalizeItemKey('ab123')).toBe(normalizeItemKey('AB123'));
  });

  it('drops zeros before the letters', () => {
    expect(normalizeItemKey('0AB123')).toBe('ab123');
    expect(normalizeItemKey('000cd5')).toBe('cd5');
  });

  it('keeps zeros after the letters', () => {
    expect(normalizeItemKey('AB012')).not.toBe(normalizeItemKey('AB12'));
    expect(normalizeItemKey('AB100')).toBe('ab100');
  });

  it('ignores whitespace', () => {
    expect(normalizeItemKey(' GH 7 ')).toBe('gh7');
  });

  it('turns empty values into an empty key', () => {
    expect(normalizeItemKey(null)).toBe('');
    expect(normalizeItemKey('   ')).toBe('');
  });
});

describe('cleanHeader', () => {
  it('collapses extra whitespace', () => {
    expect(cleanHeader('  מספר   פריט ')).toBe('מספר פריט');
  });
});
