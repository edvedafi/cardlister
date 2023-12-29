import { convertBinNumber, convertTitleToCard } from './sportlots.js';

jest.mock('open', () => jest.fn());
jest.mock('../utils/ask');
jest.mock('chalk', () => jest.fn());

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
        title: '2023 Topps Big League #80 Adolis Garcia BB',
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
        title: '2021 Score Base Set #260 Raheem Mostert FB',
        parallel: '',
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
        title: '2020 Panini Chronicles Prestige Rookies Update #310 Jalen Hurts FB',
      });
    });
  });

  describe('convertBinNumber', () => {
    it('should return an empty card object when binNumber is falsy', () => {
      const result = convertBinNumber('', 'Some Title');
      expect(result).toEqual({});
    });
    it('should return an empty card object when binNumber is actually a condition value (NM)', () => {
      const result = convertBinNumber('NM', 'Some Title');
      expect(result).toEqual({});
    });

    it('should correctly parse bin and sku when binNumber contains a pipe character', () => {
      const binNumber = '123|FS-';
      const title = 'FS-15';
      const result = convertBinNumber(binNumber, title);
      expect(result).toEqual({
        bin: '123',
        sku: '123|FS-15',
      });
    });

    it('should set sku to binNumber when title does not contain cardNumber', () => {
      const binNumber = '789|FS-15';
      const title = '15';
      const result = convertBinNumber(binNumber, title);
      expect(result).toEqual({
        bin: '789',
        sku: '789|FS-15',
      });
    });

    it('should set bin and not a sku when binNumber does not contain a pipe character', () => {
      const binNumber = '987';
      const title = 'Some Title';
      const result = convertBinNumber(binNumber, title);
      expect(result).toEqual({
        bin: '987',
      });
    });
  });
});
