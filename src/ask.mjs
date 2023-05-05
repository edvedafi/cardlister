//comment out the body of this to be prompted
import {select, confirm} from '@inquirer/prompts';

let answers = []

let questionIndex = 0;
let answerFile = 'input.json';

export const initializeAnswers = async (inputDirectory) => {
  answerFile = `${inputDirectory}input.json`;
  try {
    const answerInput = await fs.readJSON(answerFile);
    answers = answerInput.answers;
  } catch (e) {
    console.log('No prefilled answers file found');
  }
}

export const ask = async (questionText, defaultAnswer, {maxLength, selectOptions} = {}) => {
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
    } else if (defaultAnswer) {
      let displayText = questionText;
      if (maxLength) {
        if (defaultAnswer.length > maxLength) {
          displayText = `${questionText} (Max Length ${maxLength} Characters. Current: ${defaultAnswer.length})`;
        } else {
          displayText = `${questionText} (Max Length ${maxLength} Characters)`;
        }
      }
      answer = await question(`${displayText} [${defaultAnswer}]: `);
      if (!answer) {
        answer = defaultAnswer;
      }
    } else {
      answer = await question(`${questionText}: `);
    }

    if (maxLength && answer.length > maxLength) {
      answer = await ask(questionText, answer, maxLength);
    }
    answers.push(answer);
    await fs.writeJSON(answerFile, {answers});
  }

  questionIndex++;

  return answer;
}


