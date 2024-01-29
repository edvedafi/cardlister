import { getNextCounter } from './firebase.js';

jest.mock('../utils/ask');
jest.mock('../utils/spinners');

const mockCollection = jest.fn();
const mockFirestore = () => ({ collection: mockCollection });
jest.mock('../utils/firebase', () => ({ getFirestore: () => ({ collection: mockCollection }) }));

describe('Listing Sites - Firebase', () => {
  beforeEach(() => {
    mockCollection.mockReset();
  });
  describe('getNextCounter', () => {
    it('should return the first ID that does not exist in the array', async () => {
      const mockIds = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '5' }, { id: '6' }];
      mockCollection.mockReturnValue({ get: () => ({ docs: mockIds }) });
      const result = await getNextCounter('mockCollectionType');
      expect(mockCollection).toBeCalledWith('mockCollectionType');
      expect(result).toEqual(4);
    });
    it('should return the first ID that does not exist in the array (multiple open numbers)', async () => {
      const mockIds = [{ id: '1' }, { id: '2' }, { id: '5' }, { id: '6' }];
      mockCollection.mockReturnValue({ get: () => ({ docs: mockIds }) });
      const result = await getNextCounter('mockCollectionType');
      expect(mockCollection).toBeCalledWith('mockCollectionType');
      expect(result).toEqual(3);
    });
    it('should return the first ID that does not exist in the array (multiple gaps)', async () => {
      const mockIds = [{ id: '1' }, { id: '3' }, { id: '5' }, { id: '6' }];
      mockCollection.mockReturnValue({ get: () => ({ docs: mockIds }) });
      const result = await getNextCounter('mockCollectionType');
      expect(mockCollection).toBeCalledWith('mockCollectionType');
      expect(result).toEqual(2);
    });
  });
});
