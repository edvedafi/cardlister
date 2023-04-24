//comment out the body of this to be prompted
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


export const ask = async (questionText, defaultAnswer, maxLength) => {
  let answer;
  if (questionIndex < answers.length) {
    console.log(`${questionText} => ${answers[questionIndex]}`)
    answer = answers[questionIndex];
  } else {
    if (defaultAnswer) {
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
  }


  questionIndex++;

  await fs.writeJSON(answerFile, {answers});

  return answer;
}


