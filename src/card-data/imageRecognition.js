import vision from '@google-cloud/vision'
import {sports, isTeam} from "../utils/teams.mjs";
import {titleCase} from "../utils/data.mjs";

const commonWordsToAvoidOnCards = [
  'topps', 'panini', 'bowman', 'invicta'
]

const manufactures = ['topps', 'panini', 'sage', 'upper deck', 'donruss', 'fleer', 'score', 'pinnacle', 'playoff']

async function getTextFromImage(front, back, setData) {
  commonWordsToAvoidOnCards.push(setData.sport, setData.manufacture, setData.setName, setData.insert, setData.parallel);
  const defaults = {
    sport: setData.sport
  };

  // Creates a client
  const client = new vision.ImageAnnotatorClient();

  // Performs label detection on the image file
  if (!defaults.sport) {
    const [result] = await client.labelDetection(front);
    const labels = result.labelAnnotations;
    console.log('Labels:');
    labels.forEach(label => {
      if (sports.includes(label.description.toLowerCase())) {
        defaults.sport = label.description;
      }
    });
    console.log('/Labels');
  }

  // const [logoResults] = await client.logoDetection(front);
  // const logos = logoResults.logoAnnotations;
  // console.log('logos:');
  // logos.forEach(logos => console.log(logos));
  // console.log('/logos');

  const [docTextResult] = await client.documentTextDetection(front);
  // console.log('fullTextAnnotation - front:');
  // console.log(docTextResult.fullTextAnnotation);
  // docTextResult.fullTextAnnotation.pages[0].blocks.filter(block => block.blockType === 'TEXT').sort((a, b) => a.confidence < b.confidence).forEach(block => {
  //   console.log(block)
  //   console.log('words:');
  //   block.paragraphs[0].words.forEach(word => console.log(word));
  //   console.log('/words');
  // });
  // console.log(docTextResult.fullTextAnnotation.pages[0].property)
  // console.log('/fullTextAnnotation - front');

  const [backTextResult] = await client.documentTextDetection(back);
  // console.log('fullTextAnnotation - back:');
  // console.log(backTextResult.fullTextAnnotation);
  // backTextResult.fullTextAnnotation.pages[0].blocks.filter(block => block.blockType === 'TEXT').sort((a, b) => a.confidence < b.confidence).forEach(block => {
  //   console.log(block)
  //   console.log('words:');
  //   block.paragraphs[0].words.forEach(word => console.log(word));
  //   console.log('/words');
  // });
  // console.log('/fullTextAnnotation - back');

  let searchParagraphs = [];
  const addSearch = (textResult, isFront) => {
    searchParagraphs = searchParagraphs.concat(textResult.fullTextAnnotation.pages[0].blocks.filter(block => block.blockType === 'TEXT').map((block) => {
      return block.paragraphs?.map(paragraph => {
        const searchValue = {
          word: paragraph.words.map(word => word.symbols.map(symbol => symbol.text).join('')).join(' '),
          words: paragraph.words.map(word => word.symbols.map(symbol => symbol.text).join('')),
          wordCount: paragraph.words.length,
          confidence: block.confidence,
          isFront
        }
        searchValue.isNumber = !isNaN(searchValue.word);
        searchValue.lowerCase = searchValue.word.toLowerCase();
        return searchValue;
      })
    }).reduce((acc, val) => acc.concat(val), []));
  }
  addSearch(docTextResult, true);
  addSearch(backTextResult, false);
  searchParagraphs = searchParagraphs.filter(block => !commonWordsToAvoidOnCards.includes(block.lowerCase)).sort((a, b) => {
    if (a.isFront && !b.isFront) return -1;
    else if (!a.isFront && b.isFront) return 1;
    else return b.confidence - a.confidence
  });

  // console.log('searchParagraphs:', searchParagraphs);

  searchParagraphs.forEach(block => {
    const wordCountBetween = (min, max) => block.wordCount >= min && block.wordCount <= max;

    if (block.isNumber) {
      if (!defaults.year && block.word > 1900 && block.word < 2100) {
        defaults.year = block.word;
      } else if (!defaults.cardNumber && !setData.card_number_prefix && !block.isFront) {
        defaults.cardNumber = block.word;
      }
    }

    if (setData.card_number_prefix && !defaults.cardNumber) {
      // concat all but the last value in the block.words array together
      const prefix = block.words.slice(0, -1).map(word => word.toLowerCase()).join('');
      if (prefix === setData.card_number_prefix.toLowerCase()) {
        defaults.cardNumber = block.words[block.words.length - 1];
      }
    }

    let teamTest;
    if (!defaults.team) {
      block.words.forEach(word => {
        const found = isTeam(word, setData.sport);
        if (found) {
          teamTest = found[0];
        }
      });

      if (teamTest) {
        defaults.team = teamTest;
      }
    }

    if (!defaults.player) {
      if (wordCountBetween(1, 4) && !block.isNumber) {
        if (teamTest) {
          defaults.team = teamTest;
        } else {
          defaults.player = titleCase(block.word);
        }
      }
    }

    //if defaults.manufacture has not yet been set then
    if (!defaults.manufacture) {
      //check if any of the words in the manufactures array are in the word string
      manufactures.forEach(manufacture => {
        if (block.lowerCase.includes(manufacture)) {
          defaults.manufacture = titleCase(manufacture);
        }
      });
    }
  });

  // console.log(defaults);

  return defaults;
}

export default getTextFromImage
