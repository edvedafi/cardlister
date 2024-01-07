//comment out the body of this to be prompted
import { select, confirm as confirmPrompt, input } from '@inquirer/prompts';
import { isNo, isYes } from './data.js';
import filterSelectPrompt from './filterSelectPrompt.js';
import chalkTable from 'chalk-table';
import { pauseSpinners, resumeSpinners } from './spinners.js';

export const ask = async (
  questionText,
  defaultAnswer = undefined,
  { maxLength, selectOptions, isYN, cancellable = false } = {},
) => {
  pauseSpinners();
  if (typeof defaultAnswer === 'boolean' || isYes(defaultAnswer) || isNo(defaultAnswer)) {
    isYN = true;
  }
  let answer;
  if (selectOptions) {
    let choices = selectOptions.map((option) => (typeof option === 'string' ? { value: option } : option));
    answer = await filterSelectPrompt({
      message: questionText,
      choices: choices,
      default: defaultAnswer,
      cancelable: true,
    });
  } else {
    let displayText = questionText;
    if (maxLength) {
      if (defaultAnswer && defaultAnswer.length > maxLength) {
        displayText = `${questionText} [Max Length ${maxLength} Characters. Current: ${defaultAnswer.length}]`;
      } else {
        displayText = `${questionText} [Max Length ${maxLength} Characters]`;
      }
    }

    displayText = `${displayText}:`;
    if (isYN) {
      if (cancellable) {
        answer = confirmPrompt({
          message: displayText,
          default: defaultAnswer,
        });
      } else {
        answer = await confirmPrompt({
          message: displayText,
          default: defaultAnswer,
        });
      }
    } else {
      // answer = await question(`${displayText}: `);
      if (cancellable) {
        answer = input({ message: displayText, default: defaultAnswer });
      } else {
        answer = await input({ message: displayText, default: defaultAnswer });
      }
    }
  }

  if (maxLength && answer.length > maxLength) {
    if (cancellable) {
      answer = ask(questionText, answer, { maxLength });
    } else {
      answer = await ask(questionText, answer, { maxLength });
    }
  }

  resumeSpinners();
  return answer;
};

export const confirm = (questionText, defaultAnswer = false) => {
  return ask(questionText, defaultAnswer, { isYN: true, cancellable: true });
};

/**
 * @param expectedCards - an array of card numbers that should have been uploaded
 * @param uploadedCount - the number of cards that were uploaded
 * @param allCards - an object of cards keyed at their card numbers that could have been uploaded
 * @param priceField - the name of the price field that was used to upload the cards
 */
export const validateAllUploaded = async (expectedCards, uploadedCount, allCards, priceField) => {
  const expectedCardCount = expectedCards.length;
  if (uploadedCount !== expectedCardCount) {
    console.log(
      `Expected to add ${chalk.red(
        expectedCardCount,
      )} cards but only added ${uploadedCount} cards. Please manually add the following cards:`,
    );
    const options = {
      leftPad: 2,
      columns: [
        { field: 'key', name: chalk.cyan('Card #') },
        { field: 'quantity', name: chalk.cyan('Count') },
        { field: 'price', name: chalk.green(priceField) },
        { field: 'player', name: chalk.cyan('Player') },
        { field: 'title', name: chalk.yellow('Full Title') },
      ],
    };
    const table = chalkTable(
      options,
      expectedCards.map((cardNumber) => allCards[cardNumber]),
    );
    console.log(table);
    await ask('Press any key to continue...');
  }
};
