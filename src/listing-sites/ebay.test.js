import { reverseTitle } from './ebay.js';

jest.mock('open', () => jest.fn());
jest.mock('ebay-api', () => jest.fn());
jest.mock('csv-writer', () => jest.fn());
jest.mock('../utils/ask');
jest.mock('chalk', () => jest.fn());

describe('ebay', () => {
  describe('reverseTitle - used when no SKU data is available', () => {
    it('should reverse a simple title', () => {
      expect(reverseTitle('2023 Panini Score #351 Zay Flowers Baltimore Ravens RC')).toEqual({
        cardNumber: '351',
        year: '2023',
        parallel: '',
        insert: '',
        manufacture: 'Panini',
        setName: 'Score',
      });
    });
    it('should reverse a parallel title', () => {
      expect(reverseTitle('2021 Panini Playoff Kickoff Parallel #9 Justin Herbert Los Angeles Chargers')).toEqual({
        cardNumber: '9',
        year: '2021',
        parallel: 'Kickoff',
        insert: '',
        manufacture: 'Panini',
        setName: 'Playoff',
      });
    });
    it('should reverse an insert title', () => {
      expect(reverseTitle('2022 Panini Score Squad Insert #S8 Brandon Jones Miami Dolphins')).toEqual({
        cardNumber: 'S8',
        year: '2022',
        parallel: '',
        insert: 'Squad',
        manufacture: 'Panini',
        setName: 'Score',
      });
    });
    it('should reverse a title without a manufacture', () => {
      expect(reverseTitle('2022 Score Squad Insert #S8 Brandon Jones Miami Dolphins')).toEqual({
        cardNumber: 'S8',
        year: '2022',
        parallel: '',
        insert: 'Squad',
        manufacture: 'Panini',
        setName: 'Score',
      });
    });
    it('should reverse Mosaic example', () => {
      expect(reverseTitle('2021 Panini Mosaic #257 Micah Parsons Dallas Cowboys RC')).toEqual({
        cardNumber: '257',
        year: '2021',
        parallel: '',
        insert: '',
        manufacture: 'Panini',
        setName: 'Mosaic',
      });
    });
    it('should reverse a card number with spaces', () => {
      expect(reverseTitle('2023 Big League Big Leaguers Insert #BL - 29 Willie Mays San Francisco Giants')).toEqual({
        cardNumber: 'BL-29',
        year: '2023',
        parallel: '',
        insert: 'Big Leaguers',
        manufacture: 'Topps',
        setName: 'Big League',
      });
    });
  });
});
