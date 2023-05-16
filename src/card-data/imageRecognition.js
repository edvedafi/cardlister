import vision from '@google-cloud/vision'
import {sports, isTeam, leagues} from "../utils/teams.js";
import {titleCase} from "../utils/data.js";
import {ask} from "../utils/ask.js";
// import {nlp} from 'spacy-nlp';
import {HfInference} from '@huggingface/inference'
// import { readFileSync } from 'fs'

const hf = new HfInference(process.env.HF_TOKEN)
// import spacyImport from 'spacy';
// const spacy = spacyImport.default;
// console.log(spacy)
// const nlp = spacy.load('en_core_web_sm');

const manufactures = ['topps', 'panini', 'sage', 'upper deck', 'donruss', 'fleer', 'score', 'pinnacle', 'playoff']

const sets = ['prizm', 'bowman', 'donruss', 'sage', 'score', 'topps', 'fleer', 'pinnacle', 'playoff', 'upper deck',
  'elite', 'contenders', 'select', 'absolute', 'gridiron kings', 'classics', 'prestige', 'crown royale', 'limited',
  'topps chrome', 'topps finest', 'topps stadium club', 'topps heritage', 'topps archives', 'topps tribute',
  'topps inception', 'topps allen & ginter', 'topps gypsy queen', 'topps tier one', 'topps tribute', 'topps dynasty',
  'topps museum collection', 'topps five star', 'topps triple threads', 'topps archives signature series',
  'topps clearly authentic', 'topps luminaries', 'topps gold label', 'topps update', 'topps holiday', 'topps opening day',
  'topps heritage high number', 'topps big league', 'topps heritage minors', 'topps allen & ginter x', 'topps heritage high number',
  'topps heritage minors'];

const inserts = ['invicta', 'next level', 'elite series', 'the rookies']

const detectionFeatures = [
  {type: 'LABEL_DETECTION'},
  {type: 'LOGO_DETECTION'},
  {type: 'DOCUMENT_TEXT_DETECTION'}
];

// export const runHG = async (front, back, setData) => {
//   // const textfromImage = await hf.imageToText({
//   //   data: readFileSync(front),
//   //   model: 'nlpconnect/vit-gpt2-image-captioning'
//   // });
//   // console.log(textfromImage);
//   // const objectDetectionOutputValues = await hf.objectDetection({
//   //   data: readFileSync(front),
//   //   model: 'facebook/detr-resnet-50'
//   // })
//   // console.log(objectDetectionOutputValues);
//
//   const segemnts = await hf.tokenClassification({
//     model: 'dbmdz/bert-large-cased-finetuned-conll03-english',
//     inputs: 'My name is Sarah Jessica Parker but you can call me Jessica'
//   })
//   console.log(segemnts);
//
//   await ask('Continue?');
// }

async function getTextFromImage(front, back, setData) {
  let defaults = {...setData};

  // Creates a client
  const client = new vision.ImageAnnotatorClient();

  const [frontResult] = await client.annotateImage({
    image: {
      source: {
        filename: front
      },
    },
    features: detectionFeatures,
  });
  const [backResult] = await client.annotateImage({
    image: {
      source: {
        filename: back
      },
    },
    features: detectionFeatures,
  });

  defaults = {
    ...defaults,
    crop: await getCropHints(client, front),
    cropBack: await getCropHints(client, back)
  }

  /**
   * Array of searchable data
   *
   * Confidence ratings, higher sorts first:
   *
   * 602.x: Logos on the front of the card
   * 601.x: Logos on the back of the card
   *
   * 302.x: Text on the front of the card
   * 301.x: Text on the back of the card
   *
   * 102.x: Labels on the front of the card
   * 101.x: Labels on the back of the card
   *
   * @type {*[]}
   *  word: The string to search
   *  words: Broken into separate words if appropriate
   *  wordCount: The number of words in the string
   *  confidence: The confidence of the word being correct, used for sorting
   *  isFront: Whether the word is from the front or back of the card
   *  isNumber: Whether the word is a number
   *  lowerCase: The word in lower case
   */
  let searchParagraphs = [];
  // Performs label detection on the image file
  const addLabelsToSearch = (labelAnnotations, isFront) => {
    searchParagraphs.concat(labelAnnotations.map(label => {
      const searchValue = {
        word: label.description,
        words: label.description.split(' '),
        confidence: (isFront ? 102 : 101) + label.score,
        isFront
      }
      searchValue.wordCount = searchValue.words.length;
      searchValue.isNumber = !isNaN(searchValue.word);
      searchValue.lowerCase = searchValue.word.toLowerCase();
      searchParagraphs.push(searchValue);
    }));
  }
  addLabelsToSearch(frontResult.labelAnnotations, true);
  addLabelsToSearch(backResult.labelAnnotations, false);

  const addLogosToSearch = (logoAnnotations, isFront) => {
    searchParagraphs.concat(logoAnnotations.map(logo => {
      const searchValue = {
        word: logo.description,
        words: logo.description.split(' '),
        confidence: (isFront ? 602 : 601) + logo.score,
        isFront
      }
      searchValue.wordCount = searchValue.words.length;
      searchValue.isNumber = !isNaN(searchValue.word);
      searchValue.lowerCase = searchValue.word.toLowerCase();
      searchParagraphs.push(searchValue);
    }));
  }
  addLogosToSearch(frontResult.logoAnnotations, true);
  addLogosToSearch(backResult.logoAnnotations, false);

  const addSearch = async (textResult, isFront) => {
    const textBlocks = textResult.fullTextAnnotation?.pages[0]?.blocks?.filter(block => block.blockType === 'TEXT') || [];

    const blocks = await Promise.all(textBlocks.map(
      async (block) => {
        return await Promise.all(block.paragraphs?.map(async paragraph => {
          const searchValue = {
            word: paragraph.words.map(word => word.symbols.map(symbol => symbol.text).join('')).join(' '),
            words: paragraph.words.map(word => word.symbols.map(symbol => symbol.text).join('')),
            wordCount: paragraph.words.length,
            confidence: (isFront ? 302 : 301) + block.confidence,
            isFront
          }
          searchValue.isNumber = !isNaN(searchValue.word);
          searchValue.lowerCase = searchValue.word.toLowerCase();
          return searchValue;
        }))
      }));
    console.log('blocks:', blocks)
    searchParagraphs = searchParagraphs.concat(blocks.reduce((acc, val) => acc.concat(val), []));
  }
  // console.log(frontResult.fullTextAnnotation)
  await Promise.all([
    addSearch(frontResult, true),
    addSearch(backResult, false)
  ]);

  // Sort the search paragraphs by confidence
  searchParagraphs = searchParagraphs.sort((a, b) => b.confidence - a.confidence)

  //Run NLP on the entire document first
  defaults = {
    defaults,
    ...await runNLP(searchParagraphs.map(block => block.word).join('. '), defaults)
  };

  //first pass only check for near exact matches
  defaults = {
    defaults,
    ...await runFirstPass(searchParagraphs, defaults, setData)
  };
  //second pass, lets check things that are a little less exact
  defaults = {
    defaults,
    ...await runSecondPass(searchParagraphs, defaults)
  };

  //third pass, lets get really fuzzy
  defaults = {
    defaults,
    ...await fuzzyMatch(searchParagraphs, defaults)
  };

  console.log(defaults);
  await ask('Continue?');

  return defaults;
}

const getCropHints = async (client, image) => {
  const [cropHintResults] = await client.cropHints(image);
  const hint = cropHintResults.cropHintsAnnotation.cropHints[0].boundingPoly.vertices;
  const left = hint.map(h => h.x).sort((a, b) => a - b)[0];
  const top = hint.map(h => h.y).sort((a, b) => a - b)[0];
  const right = hint.map(h => h.x).sort((a, b) => b - a)[0];
  const bottom = hint.map(h => h.y).sort((a, b) => b - a)[0];
  return {left, top, width: right - left, height: bottom - top};
}

const runNLP = async (text) => {
  const results = {};
  const segemnts = await hf.tokenClassification({
    model: 'dbmdz/bert-large-cased-finetuned-conll03-english',
    // model: 'microsoft/SportsBERT',
    // parameters: {
    //   aggregation_strategy: 'max'
    // },
    inputs: text
  })
  // console.log(segemnts);
  const persons = segemnts.filter(segment => segment.entity_group === 'PER');
  console.log(persons)

  if (persons.length === 1) {
    results.player = persons[0].word;
  } else if (persons.length > 1) {
    if (persons[0].word.startsWith('. ')) {
      results.player = `${persons[1].word} ${persons[0].word.slice(2)}`;
    } else {
      results.player = `${persons[0].word} ${persons[1].word}`;
    }
  }

  return results;
}

const runFirstPass = async (searchParagraphs, defaults, setData) => {
  const results = {...defaults};
  searchParagraphs.forEach(block => {
    const wordCountBetween = (min, max) => block.wordCount >= min && block.wordCount <= max;

    // console.log('First Pass: ', block)

    if (block.isNumber) {
      if (!results.year && block.word > 1900 && block.word < 2100) {
        results.year = block.word;
      } else if (!results.cardNumber && !setData.card_number_prefix && !block.isFront) {
        results.cardNumber = block.word;
      }
    } else {

      if (setData.card_number_prefix && !results.cardNumber) {
        // concat all but the last value in the block.words array together
        const prefix = block.words.slice(0, -1).map(word => word.toLowerCase()).join('');
        if (prefix === setData.card_number_prefix.toLowerCase()) {
          results.cardNumber = block.words[block.words.length - 1];
          block.set = true;
        }
      }

      //block.set default.printRun if block.word matches a regex that is number then / then number
      if (!results.printRun && block.word.match(/^\d+\/\d+$/)) {
        results.printRun = block.word.slice(block.word.indexOf('/') + 1);
        block.set = true;
      }
      //block.set default.printRun if block.word matches a regex that is number then of then number
      if (!results.printRun && block.word.match(/^\d+ of \d+$/)) {
        results.printRun = block.word.slice(block.word.indexOf('of') + 3);
        block.set = true;
      }

      if (!results.cardNumber) {
        const firstWord = block.words[0].toLowerCase();
        if (wordCountBetween(2, 4) && ['no', 'no.'].includes(firstWord)) {
          results.cardNumber = block.words.slice(1).join('');
          block.set = true;
        }
      }

      if (!results.setName && wordCountBetween(1, 2) && sets.includes(block.lowerCase)) {
        results.setName = titleCase(block.word);
        block.set = true;
      } else if (!results.manufacture && wordCountBetween(1, 2) && manufactures.includes(block.lowerCase)) {
        results.manufacture = titleCase(block.word);
        block.set = true;
      }

      if (!results.insert && wordCountBetween(1, 2) && inserts.includes(block.lowerCase)) {
        results.insert = titleCase(block.word);
        block.set = true;
      }

      let teamTest;
      if (!results.team) {
        block.words.find(word => {
          teamTest = isTeam(word, setData.sport);
          return teamTest;
        });

        if (teamTest) {
          // console.log(teamTest)
          results.team = teamTest[0];
          block.set = true;
          if (!results.sport) {
            results.sport = teamTest[2];
          }
        }
      }
    }
  });
  return results;
}

const runSecondPass = async (searchParagraphs, defaults) => {
  const results = {...defaults};
  searchParagraphs.filter(block => !block.set).forEach(block => {
    const wordCountBetween = (min, max) => block.wordCount >= min && block.wordCount <= max;

    // console.log('second pass: ', block)

    if (!results.year) {
      results.year = copyRightYearRegexMatch(block.word);
    }

    if (!results.cardNumber) {
      //set cardNumber if the block.word matches a regex that is letters followed by numbers with an optional space between
      if (block.word.match(/^[a-zA-Z]{1,3}\s?-?\s?\d{1,3}/)) {
        results.cardNumber = block.word;
      }
    }

    if (!results.player && !block.set && block.isProperName && wordCountBetween(2, 3)) {
      results.player = titleCase(block.word);
    }
  });
  return results;
}

const yearRegex = /©\s?\d{4}/;
export const copyRightYearRegexMatch = (text) => {
  const yearMatch = text.match(yearRegex);
  if (yearMatch) {
    return yearMatch[0].slice(-4);
  }
}

const fuzzyMatch = async (searchParagraphs, defaults) => {
  const results = {...defaults};
  searchParagraphs.filter(block => !block.set).forEach(block => {
    // console.log('third pass: ', block)

    if (!results.cardNumber && block.isNumber) {
      results.cardNumber = block.word;
      block.set = true;
    }

    if (!results.player && block.isProperName) {
      results.player = titleCase(block.word);
    }
  });
  return results;
}

export default getTextFromImage
