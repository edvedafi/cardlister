import { reverseTitle } from './ebay.js';

jest.mock('open', () => jest.fn());
jest.mock('ebay-api', () => jest.fn());
jest.mock('csv-writer', () => jest.fn());
jest.mock('../utils/ask');

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
        sport: 'Football',
      });
    });
    it('should reverse a parallel title', () => {
      expect(reverseTitle('2021 Panini Playoff Kickoff Parallel #94 Justin Herbert Los Angeles Chargers')).toEqual({
        cardNumber: '94',
        year: '2021',
        parallel: 'Kickoff',
        insert: '',
        manufacture: 'Panini',
        setName: 'Playoff',
        sport: 'Football',
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
        sport: 'Football',
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
        sport: 'Football',
      });
    });
  });
});
