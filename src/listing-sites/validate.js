import chalkTable from 'chalk-table';
import { ask } from '../utils/ask.js';

/**
 * @param expectedCards - an array of cards that should have been uploaded
 * @param uploadedCards - an array of cards that were uploaded
 * @param priceField - the name of the price field that was used to upload the cards
 */
export const validateUploaded = async (expectedCards, uploadedCards, priceField) => {
  if (expectedCards.length !== uploadedCards.length) {
    let missingCards = [];
    if (uploadedCards.length < expectedCards.length) {
      console.log(
        `Expected to add ${chalk.red(expectedCards.length)} cards but only added ${chalk.red(
          uploadedCards.length,
        )} cards. Please manually add the following cards:`,
      );
      missingCards = expectedCards.filter(
        (card) => !uploadedCards.find((uploaded) => uploaded.cardNumber === card.cardNumber),
      );
    } else if (uploadedCards.length > expectedCards.length) {
      missingCards = uploadedCards.filter(
        (card) => !expectedCards.find((expected) => expected.cardNumber === card.cardNumber),
      );

      if (missingCards.length === 0) {
        const ucn = uploadedCards.map((card) => card.cardNumber).sort();
        missingCards = ucn
          .filter((value, index, self) => self.indexOf(value) !== index)
          .map((cardNumber) => {
            return expectedCards.find((card) => card.cardNumber === cardNumber);
          });
        if (missingCards.length === 0) {
          console.log('It is unclear what went wrong. Below is the list of cards uploaded vs expected');
          const uen = expectedCards.map((card) => card.cardNumber).sort();
          for (let i = 0; i < ucn.length; i++) {
            console.log(ucn[i], ' <> ', uen[i]);
          }
        } else {
          console.log(
            `Found ${chalk.red(
              missingCards.length,
            )} duplicate card numbers on the website. All cards have been uploaded and accounted for. Please verify there is not an extra card uploaded`,
          );
        }
      } else {
        console.log(
          `Expected to add ${chalk.red(expectedCards.length)} cards but actually added ${chalk.red(
            uploadedCards.length,
          )} cards. Please fix the following cards:`,
        );
      }
    }

    const table = chalkTable(
      {
        leftPad: 2,
        columns: [
          { field: 'cardNumber', name: chalk.cyan('Card #') },
          { field: 'quantity', name: chalk.cyan('Count') },
          { field: priceField, name: chalk.green('Price') },
          { field: 'player', name: chalk.cyan('Player') },
          { field: 'title', name: chalk.yellow('Full Title') },
        ],
      },
      missingCards,
    );
    console.log(table);
    await ask('Press any key to continue...');
    return false;
  } else {
    return true;
  }
};
