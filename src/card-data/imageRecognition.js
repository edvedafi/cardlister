import vision from '@google-cloud/vision'
import {sports, isTeam, leagues} from "../utils/teams.js";
import {titleCase} from "../utils/data.js";
// import {ask} from "../utils/ask.js";
// import {nlp} from 'spacy-nlp';
import {HfInference} from '@huggingface/inference'
import dotenv from 'dotenv';
import {ask} from "../utils/ask.js";

dotenv.config();
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

async function getTextFromImage(front, back, setData) {
  let defaults = {...setData};
  defaults.raw = [front, back];

  //console.log('Processing: ', defaults.raw);

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
    // console.log('blocks:', blocks)
    searchParagraphs = searchParagraphs.concat(blocks.reduce((acc, val) => acc.concat(val), []));
  }
  // console.log(frontResult.fullTextAnnotation)
  await Promise.all([
    addSearch(frontResult, true),
    addSearch(backResult, false)
  ]);

  defaults = await extractData(searchParagraphs, defaults, setData);

  // console.log(defaults);
  // await ask('Continue?');

  return defaults;
}

export const extractData = async (searchParagraphs, defaults, setData) => {
  let result = {...defaults};
  // Sort the search paragraphs by confidence
  searchParagraphs = searchParagraphs.sort((a, b) => b.confidence - a.confidence)
  // console.log('extractData', searchParagraphs);

  //Run NLP on the entire document first
  // console.log('Search Paragraphs', searchParagraphs);
  result = {
    ...result,
    ...await runNLP(searchParagraphs)
  };

  //first pass only check for near exact matches
  result = await runFirstPass(searchParagraphs, result, setData);

  //second pass, lets check things that are a little less exact
  result = await runSecondPass(searchParagraphs, result, setData);

  //third pass, lets get really fuzzy
  result = await fuzzyMatch(searchParagraphs, result, setData);

  return result;
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

export let callNLP = async (text) => {
  try {
    // console.log('calling NLP', text);
    return await hf.tokenClassification({
      model: 'dslim/bert-base-NER-uncased',
      inputs: text
    });
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
export const runNLP = async (text) => {
  const countWords = word => text.reduce((count, paragraph) => count + paragraph.lowerCase.includes(word), 0)
  const wordCount = name => name.split(' ').length;
  const results = {};
  const textBlock = text.map(block => block.word).join('. ');
  // console.log('nlp input: ', textBlock);
  const segments = await callNLP(textBlock);
  // console.log('segments', segments);
  const persons = segments.filter(segment => segment.entity_group === 'PER');
  // console.log('persons', persons)
  // await ask('Continue?');

  if (persons.length === 1) {
    results.player = titleCase(persons[0].word);
  } else if (persons.length > 1) {
    const names = persons
      //replace # with wildcard regex search for letters only of the text input
      .map(person => {
        let finalWord;
        if (person.word.includes('#')) {
          let rawWord = text.find(word => word.lowerCase.match(person.word.replace(/#/g, "[A-Za-z.']+")))
          if (rawWord) {
            const end = person.word.replace(/#/g, '');
            finalWord = rawWord.word.slice(0, rawWord.lowerCase.indexOf(end) + end.length);
          }
        }
        return {...person, word: finalWord || person.word};
      })
      //remove any words that have a non alphabetic character, also all spaces, periods and hyphens
      .filter(person => person.word.match(/^[A-Za-z\s.\-']+$/))
      //remove duplicates
      .filter((person, index, self) => index === self.findIndex(p => p.word === person.word))
      //remove any names that are in the ignore list
      .filter(person => !manufactures.includes(person.word) && !inserts.includes(person.word) && !sets.includes(person.word))
      //remove any names that are substrings of other names
      .filter(person => !persons.find(search => search.word !== person.word && search.word.includes(person.word)))
      //count the number of times that a name appears in the text
      .map(name => ({
        ...name,
        count: countWords(name.word),
        wordCount: wordCount(name.word),
      }))
      //sort first by count and then by score
      .sort((a, b) => {
        if (b.wordCount === 2 && a.wordCount !== 2) {
          return 1;
        } else if (a.wordCount === 2 && b.wordCount !== 2) {
          return -1;
        } else {
          return b.count - a.count || b.score - a.score
        }
      })
      //remove all the excess info
      .map(person => person.word)
      //remove any team names
      .filter(name => !isTeam(name));

    // console.log('selecting persons from: ', names)
    if (names[0].includes(' ')) {
      results.player = titleCase(names[0]);
    } else if (names[1].includes(' ')) {
      results.player = titleCase(names[0]);
    } else if (names.length === 3) {
      const firstInitial = names.find(name => name.length === 1);
      const secondInitial = names.find(name => name.length === 1 && name !== firstInitial);
      const lastName = names.find(name => name.length > 1);

      if (countWords(`${firstInitial}${secondInitial} ${lastName}`) > 0) {
        results.player = titleCase(`${firstInitial}${secondInitial} ${lastName}`);
      } else if (countWords(`${firstInitial}.${secondInitial}. ${lastName}`) > 0) {
        results.player = titleCase(`${firstInitial}.${secondInitial}. ${lastName}`);
      } else if (countWords(`${firstInitial}. ${secondInitial}. ${lastName}`) > 0) {
        results.player = titleCase(`${firstInitial}. ${secondInitial}. ${lastName}`);
      } else {
        results.player = titleCase(`${firstInitial} ${secondInitial} ${lastName}`);
      }
    } else {
      //check to see if any of our options are exact 2 words that both have letters in them
      const twoWords = names.filter(name => {
        const split = name.split(' ')
        return split.length === 2 && split[0].match(/[A-Za-z]/) && split[1].match(/[A-Za-z]/)
      });

      if (twoWords.length === 1) {
        results.player = titleCase(twoWords[0]);
      } else {
        results.player = titleCase(`${names[0]} ${names[1]}`);
      }
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
      //do nothing in the first pass
    } else {

      if (!results.year) {
        const regexMatch = copyRightYearRegexMatch(block.word);
        if (regexMatch) {
          results.year = regexMatch;
        }
      }

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

      if (block.word === 'RC') {
        results.features = addFeature(results.features, 'RC');
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

const runSecondPass = async (searchParagraphs, defaults, setData) => {
  const results = {...defaults};
  searchParagraphs.filter(block => !block.set).forEach(block => {
    const wordCountBetween = (min, max) => block.wordCount >= min && block.wordCount <= max;

    // console.log('second pass: ', block)

    if (block.isNumber) {
      if (!results.year && block.word > 1900 && block.word < 2100) {
        results.year = block.word;
      } else if (!results.cardNumber && !setData.card_number_prefix && !block.isFront) {
        results.cardNumber = block.word;
      }
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

const addFeature = (features, feature) => {
  if (!features) {
    return feature;
  } else if (features.indexOf(feature) > -1) {
    return features;
  } else {
    return `${features} | ${feature}`;
  }
}

export default getTextFromImage
