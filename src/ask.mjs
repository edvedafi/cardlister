//comment out the body of this to be prompted
import {select, confirm as confirmPrompt, input} from '@inquirer/prompts';
import {isNo, isYes} from "./utils/data.mjs";

let answers = []

let questionIndex = 0;
let answerFile = 'input.json';

export const initializeAnswers = async (inputDirectory) => {
  answerFile = `${inputDirectory}input.json`;
  try {
    const answerInput = await fs.readJSON(answerFile);
    answers = answerInput.answers;

    return confirmPrompt({message: 'Reprocess existing images', "default": false});
  } catch (e) {
    console.log('No prefilled answers file found');
  }
}

export const ask = async (questionText, defaultAnswer, {maxLength, selectOptions, isYN} = {}) => {
  if (typeof defaultAnswer === 'boolean' || isYes(defaultAnswer) || isNo(defaultAnswer)) {
    isYN = true;
  }
  let answer;
  if (questionIndex < answers.length) {
    console.log(`${questionText} => ${answers[questionIndex]}`)
    answer = answers[questionIndex];
  } else {
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

      if (isYN) {
        answer = await confirmPrompt({message: displayText, 'default': defaultAnswer});
      } else {
        // answer = await question(`${displayText}: `);
        answer = await input({message: displayText, 'default': defaultAnswer});
      }
    }

    if (!answer) {
      answer = defaultAnswer;
    }

    if (maxLength && answer.length > maxLength) {
      answer = await ask(questionText, answer, {maxLength});
    }
    answers.push(answer);
    await fs.writeJSON(answerFile, {answers});
  }

  questionIndex++;

  return answer;
}

export const confirm = async (questionText, defaultAnswer) => {
  return await ask(questionText, defaultAnswer, {isYN: true});
}

