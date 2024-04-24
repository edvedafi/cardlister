import { byCardNumber, firstDifference, graders } from './data.js';
import { graderIds } from '../listing-sites/ebayConstants.js';
import { describe } from 'node:test';

describe('sortByCardNumber', () => {
  it('should sort an all numeric array correctly', () => {
    expect(
      [
        { cardNumber: 45 },
        { cardNumber: 4 },
        { cardNumber: 75 },
        { cardNumber: 1 },
        { cardNumber: 99 },
        { cardNumber: 111 },
        { cardNumber: 6 },
        { cardNumber: 11 },
        { cardNumber: 42 },
      ].sort(byCardNumber),
    ).toEqual([
      { cardNumber: 1 },
      { cardNumber: 4 },
      { cardNumber: 6 },
      { cardNumber: 11 },
      { cardNumber: 42 },
      { cardNumber: 45 },
      { cardNumber: 75 },
      { cardNumber: 99 },
      { cardNumber: 111 },
    ]);
  });
  it('should sort an all alpha array correctly', () => {
    expect(
      [
        { cardNumber: 'P-DB' },
        { cardNumber: 'P-SH' },
        { cardNumber: 'P-GW' },
        { cardNumber: 'P-KYW' },
        { cardNumber: 'P-AH' },
        { cardNumber: 'P-KP' },
      ].sort(byCardNumber),
    ).toEqual([
      { cardNumber: 'P-AH' },
      { cardNumber: 'P-DB' },
      { cardNumber: 'P-GW' },
      { cardNumber: 'P-KP' },
      { cardNumber: 'P-KYW' },
      { cardNumber: 'P-SH' },
    ]);
  });
  it('should sort an alpha numeric array correctly', () => {
    expect(
      [
        { cardNumber: 'FS45' },
        { cardNumber: 'FS4' },
        { cardNumber: 'FS75' },
        { cardNumber: 'FS1' },
        { cardNumber: 'FS99' },
        { cardNumber: 'FS111' },
        { cardNumber: 'FS6' },
        { cardNumber: 'FS11' },
        { cardNumber: 'FS42' },
      ].sort(byCardNumber),
    ).toEqual([
      { cardNumber: 'FS1' },
      { cardNumber: 'FS4' },
      { cardNumber: 'FS6' },
      { cardNumber: 'FS11' },
      { cardNumber: 'FS42' },
      { cardNumber: 'FS45' },
      { cardNumber: 'FS75' },
      { cardNumber: 'FS99' },
      { cardNumber: 'FS111' },
    ]);
  });
});

describe('Graders List', () => {
  it('should match the keys of ebay graders', () => {
    expect(graders).toEqual(Object.keys(graderIds));
  });
});

describe('firstDifference', () => {
  it('should return the index of the first difference between two strings', () => {
    expect(firstDifference('hello world', 'hello world')).toBeUndefined();
    expect(firstDifference('hello world', 'hello')).toBe(1);
    expect(firstDifference('hello world', 'hello world test')).toBe(2);
    expect(firstDifference('hello world', 'hello world test')).toBe(2);
    expect(firstDifference('hello world', 'hello world test')).toBe(2);
  });
});
