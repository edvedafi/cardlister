import { convertTitleToCard } from './sportlots.js';

jest.mock('open', () => jest.fn()););
jest.mock('../utils/ask');

describe('Sport Lots', () => {
  describe('convertTitleToCard', () => {
    it('should convert a simple baseball title', () => {
      expect(convertTitleToCard('2023 Topps Big League #80 Adolis Garcia BB')).toEqual({
        cardNumber: '80',
        year: '2023',
        parallel: '',
        insert: '',
        manufacture: 'Topps',
        setName: 'Big League',
        sport: 'Baseball',
      });
    });
    it('should convert a simple Football title', () => {
      expect(convertTitleToCard('2021 Score Base Set #260 Raheem Mostert FB')).toEqual({
        cardNumber: '260',
        year: '2021',
        insert: '',
        manufacture: 'Panini',
        setName: 'Score',
        sport: 'Football',
      });
    });
    it('should convert an insert title', () => {
      expect(convertTitleToCard('2020 Panini Chronicles Prestige Rookies Update #310 Jalen Hurts FB')).toEqual({
        cardNumber: '310',
        year: '2020',
        parallel: '',
        insert: 'Prestige Rookies Update',
        manufacture: 'Panini',
        setName: 'Chronicles',
        sport: 'Football',
      });
    });
  });
});
