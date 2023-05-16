//comment out the body of this to be prompted
import {select, confirm as confirmPrompt, input} from '@inquirer/prompts';
import {isNo, isYes} from "./data.js";

export const ask = async (questionText, defaultAnswer = undefined, {maxLength, selectOptions, isYN} = {}) => {
  if (typeof defaultAnswer === 'boolean' || isYes(defaultAnswer) || isNo(defaultAnswer)) {
    isYN = true;
  }
  let answer;
  if (selectOptions) {
    let choices = selectOptions.map((option) => typeof option === 'string' ? {value: option} : option);
    if (defaultAnswer) {
      choices = choices.sort((a, b) => {
        if (a.value === defaultAnswer) {
          return -1;
        } else if (b.value === defaultAnswer) {
          return 1;
        } else {
          return 0;
        }
      });
    }
    answer = await select({
      message: questionText,
      choices: choices,
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
      answer = await confirmPrompt({message: displayText, 'default': defaultAnswer});
    } else {
      // answer = await question(`${displayText}: `);
      answer = await input({message: displayText, 'default': defaultAnswer});
    }
  }

  if (maxLength && answer.length > maxLength) {
    answer = await ask(questionText, answer, {maxLength});
  }

  return answer;
}

export const confirm = async (questionText, defaultAnswer) => {
  return await ask(questionText, defaultAnswer, {isYN: true});
}

