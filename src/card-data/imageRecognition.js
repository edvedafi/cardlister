import vision from '@google-cloud/vision'
import {sports, isTeam, leagues} from "../utils/teams.mjs";
import {titleCase} from "../utils/data.mjs";
import {ask} from "../utils/ask.mjs";
import {nlp} from 'spacy-nlp';
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
  const defaults = {
    sport: setData.sport
  };

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

  const [cropHintResults] = await client.cropHints(front);
  const hint = cropHintResults.cropHintsAnnotation.cropHints[0].boundingPoly.vertices;
  const left = hint.map(h => h.x).sort((a, b) => a - b)[0];
  const top = hint.map(h => h.y).sort((a, b) => a - b)[0];
  const right = hint.map(h => h.x).sort((a, b) => b - a)[0];
  const bottom = hint.map(h => h.y).sort((a, b) => b - a)[0];
  defaults.crop = {left, top, width: right - left, height: bottom - top};

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
    const textBlocks = textResult.fullTextAnnotation.pages[0].blocks.filter(block => block.blockType === 'TEXT');

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

          if (!searchValue.isNumber) {
            // const result = await nlp.parse(searchValue.word);
            // console.log('Looking for names in buffer: ', searchValue.word);
            // console.log('Result: ', result);
            // if (result) {
            //   console.log('Result[0]: ', result[0]);
            //   console.log('Result[0][\'parse_list\']: ', result[0]['parse_list']);
            //   result[0]['parse_list'].forEach((element) => {
            //     if (element.NE === 'PERSON') {
            //       searchValue.isPerson = true;
            //     } else if (element.POS_coarse === 'PROPN') {
            //       searchValue.isProperName = true;
            //     }
            //   });
            //   if (result.len === 3 &&
            //     result[0]['parse_list'][0].POS_coarse !== 'num' &&
            //     result[0]['parse_list'][1].POS_fine !== 'HYPH' &&
            //     result[0]['parse_list'][2].POS_coarse === 'num') {
            //     searchValue.potentialCardNumber = true;
            //   }
            //   if (result.len === 2 &&
            //     result[0]['parse_list'][0].POS_coarse !== 'num' &&
            //     result[0]['parse_list'][1].POS_fine !== 'HYPH' &&
            //     result[0]['parse_list'][2].POS_coarse === 'num') {
            //     searchValue.potentialCardNumber = true;
            //   }
            // }

          }
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

  // console.log('searchParagraphs:', searchParagraphs);

  // Sort the search paragraphs by confidence
  searchParagraphs = searchParagraphs.sort((a, b) => b.confidence - a.confidence)


  // const doc = await nlp(searchParagraphs.join('\n'));
  // for (let ent of doc.ents) {
  //   console.log(ent.text, ent.label);
  // }
  // for (let token of doc) {
  //   console.log(token.text, token.pos, token.head.text);
  // }
  const searchAll = searchParagraphs.map(block=>block.word).join('\n');
  const result = await nlp.parse(searchAll);
  console.log('Looking for names in buffer: ', searchAll);
  console.log('Result: ', result);
  if (result) {
    console.log('Result[0]: ', result[0]);
    // console.log('Result[0][\'parse_list\']: ', result[0]['parse_list']);
    result[0]['parse_list'].forEach((element) => {
      if (element.NE === 'PERSON') {
        // searchValue.isPerson = true;
        console.log('Found a person!', element.word);
      } else if (element.POS_coarse === 'PROPN') {
        // searchValue.isProperName = true;
        console.log('Found a proper name!', element.word);
      }
    });
    if (result.len === 3 &&
      result[0]['parse_list'][0].POS_coarse !== 'num' &&
      result[0]['parse_list'][1].POS_fine !== 'HYPH' &&
      result[0]['parse_list'][2].POS_coarse === 'num') {
      // searchValue.potentialCardNumber = true;
      console.log('found potential card number 3', result)
    }
    if (result.len === 2 &&
      result[0]['parse_list'][0].POS_coarse !== 'num' &&
      result[0]['parse_list'][1].POS_fine !== 'HYPH' &&
      result[0]['parse_list'][2].POS_coarse === 'num') {
      console.log('found potential card number 2', result)
    }
  }

  //first pass only check for near exact matches
  searchParagraphs.forEach(block => {
    const wordCountBetween = (min, max) => block.wordCount >= min && block.wordCount <= max;

    // console.log('checking: ', block)

    if (block.isNumber) {
      if (!defaults.year && block.word > 1900 && block.word < 2100) {
        defaults.year = block.word;
      } else if (!defaults.cardNumber && !setData.card_number_prefix && !block.isFront) {
        defaults.cardNumber = block.word;
      }
    } else {

      if (setData.card_number_prefix && !defaults.cardNumber) {
        // concat all but the last value in the block.words array together
        const prefix = block.words.slice(0, -1).map(word => word.toLowerCase()).join('');
        if (prefix === setData.card_number_prefix.toLowerCase()) {
          defaults.cardNumber = block.words[block.words.length - 1];
          block.set = true;
        }
      }

      if (!defaults.player && block.isPerson) {
        defaults.player = block.word;
        block.set = true;
      }

      //block.set default.printRun if block.word matches a regex that is number then / then number
      if (!defaults.printRun && block.word.match(/^\d+\/\d+$/)) {
        defaults.printRun = block.word.slice(block.word.indexOf('/') + 1);
        block.set = true;
      }
      //block.set default.printRun if block.word matches a regex that is number then of then number
      if (!defaults.printRun && block.word.match(/^\d+ of \d+$/)) {
        defaults.printRun = block.word.slice(block.word.indexOf('of') + 3);
        block.set = true;
      }

      if (!defaults.cardNumber) {
        const firstWord = block.words[0].toLowerCase();
        if (wordCountBetween(2, 4) && ['no', 'no.'].includes(firstWord)) {
          defaults.cardNumber = block.words.slice(1).join('');
          block.set = true;
        }
      }

      if (!defaults.manufacture && wordCountBetween(1, 2) && manufactures.includes(block.lowerCase)) {
        defaults.manufacture = titleCase(block.word);
        block.set = true;
      }

      if (!defaults.setName && wordCountBetween(1, 2) && sets.includes(block.lowerCase)) {
        defaults.setName = titleCase(block.word);
        block.set = true;
      }

      if (!defaults.insert && wordCountBetween(1, 2) && inserts.includes(block.lowerCase)) {
        defaults.insert = titleCase(block.word);
        block.set = true;
      }

      let teamTest;
      if (!defaults.team) {
        block.words.find(word => {
          teamTest = isTeam(word, setData.sport);
          return teamTest;
        });

        if (teamTest) {
          // console.log(teamTest)
          defaults.team = teamTest[0];
          block.set = true;
          if (!defaults.sport) {
            defaults.sport = teamTest[2];
          }
        }
      }
    }
  });

  //second pass, lets check things that are a little less exact
  const yearRegex = /©\s?\d{4}/;
  searchParagraphs.filter(block => !block.set).forEach(block => {
    const wordCountBetween = (min, max) => block.wordCount >= min && block.wordCount <= max;

    // console.log('second pass: ', block)

    if (!defaults.year) {
      const yearMatch = block.word.match(yearRegex);
      if (yearMatch) {
        console.log(yearMatch)
        defaults.year = yearMatch[0].slice(-4);
        block.set = true;
      }
    }

    if (!defaults.cardNumber) {
      //set cardNumber if the block.word matches a regex that is letters followed by numbers with an optional space between
      if (block.word.match(/^[a-zA-Z]{1,3}\s?-?\s?\d{1,3}/)) {
        defaults.cardNumber = block.word;
        block.set = true;
      }
    }

    if (!defaults.player && !block.set && block.isProperName && wordCountBetween(2, 3)) {
      defaults.player = titleCase(block.word);
    }
  });

  //third pass, lets get really fuzzy
  searchParagraphs.filter(block => !block.set).forEach(block => {
    // console.log('third pass: ', block)

    if (!defaults.cardNumber && block.isNumber) {
      defaults.cardNumber = block.word;
      block.set = true;
    }

    if (!defaults.player && block.isProperName) {
      defaults.player = titleCase(block.word);
    }
  });

  console.log(defaults);
  await ask('Continue?');

  return defaults;
}


export default getTextFromImage
