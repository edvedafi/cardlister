import { validateUploaded } from './validate.js';

jest.mock('../utils/ask.js');
jest.mock('chalk-table');
jest.mock('@inquirer/prompts');

import { ask } from '../utils/ask.js';
import { mockChalk, removeChalkMock } from '../mocks/chalk.js';
import chalkTable from 'chalk-table';

const mockConsoleLog = jest.fn();
let originalConsoleLog = console.log;

// jest.mock('./ask.js', () => ({
//   ask: jest.fn(),
// }));
describe('ask', () => {
  beforeAll(() => {
    mockChalk();
  });
  beforeEach(() => {
    // ask.mockReset();
    mockConsoleLog.mockReset();
    chalkTable.mockReset();
    originalConsoleLog = console.log;
    console.log = mockConsoleLog;
  });
  afterEach(() => {
    console.log = originalConsoleLog;
  });
  afterAll(() => {
    removeChalkMock();
  });

  describe('validateUploaded', () => {
    it('should return true if expected cards to upload matches what was uploaded', async () => {
      const expectedCards = [
        { cardNumber: 1, quantity: 1, price: 1, player: 'player1', title: 'title1', bscPrice: 1, slPrice: 2 },
        { cardNumber: 2, quantity: 1, price: 1, player: 'player2', title: 'title2', bscPrice: 1, slPrice: 2 },
        { cardNumber: 3, quantity: 1, price: 1, player: 'player3', title: 'title3', bscPrice: 1, slPrice: 2 },
      ];
      const uploadedCount = [
        { cardNumber: 1, quantity: 1, price: 1, player: 'player1', title: 'title1', bscPrice: 1, slPrice: 2 },
        { cardNumber: 2, quantity: 1, price: 1, player: 'player2', title: 'title2', bscPrice: 1, slPrice: 2 },
        { cardNumber: 3, quantity: 1, price: 1, player: 'player3', title: 'title3', bscPrice: 1, slPrice: 2 },
      ];
      expect(await validateUploaded(expectedCards, uploadedCount, 'bscPrice')).toEqual(true);
    });
    it('should return false if expected cards to upload is larger than what was uploaded', async () => {
      const expectedCards = [
        { cardNumber: 1, quantity: 1, price: 1, player: 'player1', title: 'title1', bscPrice: 1, slPrice: 2 },
        { cardNumber: 2, quantity: 1, price: 1, player: 'player2', title: 'title2', bscPrice: 1, slPrice: 2 },
      ];
      const uploadedCount = [
        { cardNumber: 1, quantity: 1, price: 1, player: 'player1', title: 'title1', bscPrice: 1, slPrice: 2 },
        { cardNumber: 2, quantity: 1, price: 1, player: 'player2', title: 'title2', bscPrice: 1, slPrice: 2 },
        { cardNumber: 3, quantity: 1, price: 1, player: 'player3', title: 'title3', bscPrice: 1, slPrice: 2 },
      ];
      expect(await validateUploaded(expectedCards, uploadedCount, 'bscPrice')).toEqual(false);
    });
    it('should print the cards that were missed if expected cards to upload is larger than what was uploaded', async () => {
      const expectedCards = [
        { cardNumber: 1, quantity: 1, price: 1, player: 'player1', title: 'title1', bscPrice: 1, slPrice: 2 },
        { cardNumber: 2, quantity: 1, price: 1, player: 'player2', title: 'title2', bscPrice: 1, slPrice: 2 },
        { cardNumber: 3, quantity: 1, price: 1, player: 'player3', title: 'title3', bscPrice: 1, slPrice: 2 },
      ];
      const uploadedCount = [
        { cardNumber: 1, quantity: 1, price: 1, player: 'player1', title: 'title1', bscPrice: 1, slPrice: 2 },
        { cardNumber: 3, quantity: 1, price: 1, player: 'player3', title: 'title3', bscPrice: 1, slPrice: 2 },
      ];
      chalkTable.mockReturnValue('Mock chalkTable');
      ask.mockResolvedValue();
      await validateUploaded(expectedCards, uploadedCount, 'bscPrice');
      expect(console.log).toHaveBeenCalledWith(
        'Expected to add red:(3) cards but only added red:(2) cards. Please manually add the following cards:',
      );
      expect(chalkTable).toHaveBeenCalledWith(
        {
          leftPad: 2,
          columns: [
            { field: 'cardNumber', name: chalk.cyan('Card #') },
            { field: 'quantity', name: chalk.cyan('Count') },
            { field: 'price', name: chalk.green('bscPrice') },
            { field: 'player', name: chalk.cyan('Player') },
            { field: 'title', name: chalk.yellow('Full Title') },
          ],
        },
        [{ cardNumber: 2, quantity: 1, price: 1, player: 'player2', title: 'title2', bscPrice: 1, slPrice: 2 }],
      );
      expect(console.log).toHaveBeenCalledWith('Mock chalkTable');
      expect(ask).toHaveBeenCalledWith('Press any key to continue...');
    });
    it('should return false if expected cards to upload is smaller than what was uploaded', async () => {
      const expectedCards = [
        { cardNumber: 1, quantity: 1, price: 1, player: 'player1', title: 'title1', bscPrice: 1, slPrice: 2 },
        { cardNumber: 3, quantity: 1, price: 1, player: 'player3', title: 'title3', bscPrice: 1, slPrice: 2 },
      ];
      const uploadedCount = [
        { cardNumber: 1, quantity: 1, price: 1, player: 'player1', title: 'title1', bscPrice: 1, slPrice: 2 },
        { cardNumber: 2, quantity: 1, price: 1, player: 'player2', title: 'title2', bscPrice: 1, slPrice: 2 },
        { cardNumber: 3, quantity: 1, price: 1, player: 'player3', title: 'title3', bscPrice: 1, slPrice: 2 },
      ];
      chalkTable.mockReturnValue('Mock chalkTable');
      ask.mockResolvedValue();
      await validateUploaded(expectedCards, uploadedCount, 'bscPrice');
      expect(console.log).toHaveBeenCalledWith(
        'Expected to add red:(2) cards but actually added red:(3) cards. Please fix the following cards:',
      );
      expect(chalkTable).toHaveBeenCalledWith(
        {
          leftPad: 2,
          columns: [
            { field: 'cardNumber', name: chalk.cyan('Card #') },
            { field: 'quantity', name: chalk.cyan('Count') },
            { field: 'price', name: chalk.green('bscPrice') },
            { field: 'player', name: chalk.cyan('Player') },
            { field: 'title', name: chalk.yellow('Full Title') },
          ],
        },
        [{ cardNumber: 2, quantity: 1, price: 1, player: 'player2', title: 'title2', bscPrice: 1, slPrice: 2 }],
      );
      expect(console.log).toHaveBeenCalledWith('Mock chalkTable');
      expect(ask).toHaveBeenCalledWith('Press any key to continue...');
    });
    it('should display the card number if there appears to be 2 of the same card number', async () => {
      const expectedCards = [
        { cardNumber: 'CN-AB', quantity: 1, price: 1, player: 'AB', title: 'title AB', bscPrice: 1, slPrice: 2 },
        { cardNumber: 'CN-CD', quantity: 1, price: 1, player: 'CD', title: 'title CD', bscPrice: 1, slPrice: 2 },
        { cardNumber: 'CN-EF', quantity: 1, price: 1, player: 'EF', title: 'title EF', bscPrice: 1, slPrice: 2 },
      ];
      const uploadedCount = [
        { cardNumber: 'CN-AB', quantity: 1, price: 1, player: 'AB', title: 'title AB', bscPrice: 1, slPrice: 2 },
        { cardNumber: 'CN-CD', quantity: 1, price: 1, player: 'CD', title: 'title CD', bscPrice: 1, slPrice: 2 },
        { cardNumber: 'CN-CD', quantity: 1, price: 1, player: 'CD', title: 'title CD', bscPrice: 1, slPrice: 2 },
        { cardNumber: 'CN-EF', quantity: 1, price: 1, player: 'EF', title: 'title EF', bscPrice: 1, slPrice: 2 },
      ];
      chalkTable.mockReturnValue('Mock chalkTable');
      ask.mockResolvedValue();
      await validateUploaded(expectedCards, uploadedCount, 'bscPrice');
      expect(console.log).toHaveBeenCalledWith(
        'Found red:(1) duplicate card numbers on the website. All cards have been uploaded and accounted for. Please verify there is not an extra card uploaded',
      );
      expect(chalkTable).toHaveBeenCalledWith(
        {
          leftPad: 2,
          columns: [
            { field: 'cardNumber', name: chalk.cyan('Card #') },
            { field: 'quantity', name: chalk.cyan('Count') },
            { field: 'price', name: chalk.green('bscPrice') },
            { field: 'player', name: chalk.cyan('Player') },
            { field: 'title', name: chalk.yellow('Full Title') },
          ],
        },
        [{ cardNumber: 'CN-CD', quantity: 1, price: 1, player: 'CD', title: 'title CD', bscPrice: 1, slPrice: 2 }],
      );
      expect(console.log).toHaveBeenCalledWith('Mock chalkTable');
      expect(ask).toHaveBeenCalledWith('Press any key to continue...');
    });
  });
});
