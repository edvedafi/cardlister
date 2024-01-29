import { convertBinNumber, convertTitleToCard } from './sportlots.js';
import { mockChalk, removeChalkMock } from '../mocks/chalk.js';

jest.mock('open', () => jest.fn());
jest.mock('../utils/ask');
jest.mock('../utils/spinners');
//2019 Donruss Base Set #312 Marquise Brown FB
describe('Sport Lots', () => {
  beforeAll(() => {
    mockChalk();
  });
  afterAll(() => {
    removeChalkMock();
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
