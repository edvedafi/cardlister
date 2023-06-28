import {ask, confirm} from "../utils/ask.js";
import {findLeague, findTeam, sports} from "../utils/teams.js";
import {isNo, isYes} from "../utils/data.js";
import fs from 'fs-extra';

//Set up the card name and track with previous for front/back situations
let answerFile;
const saveData = {
  metadata: {},
  setData: {},
  allCardData: {}
}
export const initializeAnswers = async (inputDirectory, readExact = false) => {
  answerFile = `${inputDirectory}input.json`;

  try {
    const answerInput = await fs.readJSON(answerFile);
    // console.log('answerInput', answerInput);

    saveData.metadata = answerInput.metadata;
    saveData.metadata.reprocessImages = readExact ? false : await ask('Reprocess existing images', false);

    saveData.allCardData = readExact ? answerInput.allCardData : Object.values(answerInput.allCardData).map(card => ({
      ...card,
      //clear out the pics property because it is appended to every run
      pics: saveData.metadata.reprocessImages ? '' : card.pics,
      //reset the count to 0 if we want to reuse the existing images
      count: saveData.metadata.reprocessImages ? 0 : card.count,
    })).reduce((acc, card) => {
      acc[card.cardNumber] = card;
      return acc;
    }, {});
    saveData.setData = answerInput.setData;
    console.log('saveData', saveData);
  } catch (e) {
    console.log(e)
    console.log('No prefilled answers file found');
  }

  return saveData;
}

export const mockSavedSetData = (data) => saveData.setData = data;

const saveAnswers = (cardData) => {
  if (cardData) {
    saveData.allCardData = cardData;
  }
  fs.writeJSON(answerFile, saveData).catch((e) => {
    console.log('Error saving answers', e);
  });
}

export const getSetData = async () => {
  const isSet = await ask('Is this a complete set?', isYes(saveData.setData?.isSet));

  const askWithNoToSkip = async (question, defaultValue) => {
    let dv;
    if (typeof defaultValue === 'boolean') {
      if (defaultValue === true) {
        dv = true;
      } else {
        dv = 'n';
      }
    } else {
      dv = `${defaultValue}`;
    }
    return await ask(`${question} (enter No to skip)`, defaultValue);
  }

  if (isSet) {
    saveData.setData.isSet = true;
    
    saveData.setData.sport = await ask('Sport', saveData.setData.sport || 'Football', {selectOptions: sports});
    saveData.setData.year = await ask('Year', saveData.setData.year);
    saveData.setData.player = await ask('Player', saveData.setData.player);
    saveData.setData.manufacture = await ask('Manufacturer', saveData.setData.manufacture);
    saveData.setData.setName = await ask('Set Name', saveData.setData.setName);
    saveData.setData.insert = await askWithNoToSkip('Insert', saveData.setData.insert);
    saveData.setData.parallel = await askWithNoToSkip('Parallel', saveData.setData.parallel);
    saveData.setData.features = await ask('Features', saveData.setData.features);
    saveData.setData.printRun = await askWithNoToSkip('Print Run', saveData.setData.printRun);
    saveData.setData.autographed = await askWithNoToSkip('Autograph', saveData.setData.autographed);

    saveData.setData.card_number_prefix = await ask('Enter Card Number Prefix', saveData.setData.card_number_prefix);
    saveData.setData.price = await ask('Default Price', saveData.setData.price);
    saveData.setData.autoOffer = await ask('Default Auto Accept Offer', saveData.setData.autoOffer);
  } else {
    saveData.setData = {};
  }
  saveAnswers();
  return saveData.setData;
}

const add = (info, modifier) => info ? modifier ? ` ${info} ${modifier}` : ` ${info}` : '';

//try to get to the best 80 character title that we can
async function getCardTitle(output) {

  const maxTitleLength = 80;

  let insert = add(output.insert, 'Insert');
  let parallel = add(output.parallel, 'Parallel');
  let features = add(output.features).replace('|', '');
  let printRun = output.printRun ? ` /${output.printRun}` : '';

  output.longTitle = `${output.year} ${output.setName}${insert}${parallel} #${output.cardNumber} ${output.player} ${output.team}${features}${printRun}`;
  let title = output.longTitle;
  if (title.length > maxTitleLength) {
    insert = add(output.insert);
    title = `${output.year} ${output.setName}${insert}${parallel} #${output.cardNumber} ${output.player} ${output.team}${features}${printRun}`
  }
  if (title.length > maxTitleLength) {
    parallel = add(output.parallel);
    title = `${output.year} ${output.setName}${insert}${parallel} #${output.cardNumber} ${output.player} ${output.team}${features}${printRun}`
  }
  if (title.length > maxTitleLength) {
    title = `${output.year} ${output.setName}${insert}${parallel} #${output.cardNumber} ${output.player} ${output.teamName}${features}${printRun}`
  }
  if (title.length > maxTitleLength) {
    title = `${output.year} ${output.setName}${insert}${parallel} #${output.cardNumber} ${output.player}${features}${printRun}`
  }
  if (title.length > maxTitleLength) {
    title = `${output.year} ${output.setName}${insert}${parallel} #${output.cardNumber} ${output.player}${printRun}`
  }

  title = title.replace(/  /g, ' ');

  return await ask(`Title`, title, {maxLength: maxTitleLength});
}

async function getCardName(output) {
  //generate a 60 character card name
  const maxCardNameLength = 60;
  let cardName = output.title;
  let insert = add(output.insert);
  let parallel = add(output.parallel);
  if (cardName.length > maxCardNameLength) {
    cardName = `${output.year} ${output.manufacture} ${output.setName}${insert}${parallel} ${output.player}`;
  }
  if (cardName.length > maxCardNameLength) {
    cardName = `${output.year} ${output.setName}${insert}${parallel} ${output.player}`;
  }
  if (cardName.length > maxCardNameLength) {
    cardName = `${output.year} ${output.setName}${insert}${parallel}`;
  }
  if (cardName.length > maxCardNameLength) {
    cardName = `${output.setName}${insert}${parallel}`;
  }
  cardName = cardName.replace(/  /g, ' ');
  return await ask('Card Name', cardName, {maxLength: maxCardNameLength});
}

const vintageYear = 1980;

export async function addCardData(text, output, propName, defaultValues, options) {
  if (  saveData?.setData &&  saveData?.setData[propName] ) {
    if ( !isNo(saveData?.setData[propName]) ) {
      output[propName] = saveData?.setData[propName];
    }
  } else {
    output[propName] = await ask(text, defaultValues[propName], options);
  }
}

async function getNewCardData(cardNumber, defaults = {}) {
  const defaultValues = {
    sport: 'football',
    quantity: 1,
    price: 0.99,
    ...defaults
  };
  let output = {
    cardNumber: saveData.setData.card_number_prefix && !cardNumber.startsWith(saveData.setData.card_number_prefix) ? `${saveData.setData.card_number_prefix}${cardNumber}` : cardNumber,
    count: 1,
    pics: [],
    ...defaultValues
  };

  const askFor = async (text, propName, options) => await addCardData(text, output, propName, defaultValues, options);

  await askFor('Sport', 'sport', {selectOptions: sports});
  output.league = findLeague(output.sport);
  await askFor('Player/Card Name', 'player');
  await askFor('Year', 'year');
    [output.team, output.teamName] = findTeam(await ask('Team', defaultValues.team), output.sport, output.year);
  await askFor('Manufacturer', 'manufacture');
  await askFor('Set Name', 'setName');

  let skipShipping = await ask('Is base card?', true);

  if (skipShipping) {
    output.title = await getCardTitle(output);
    output.cardName = await getCardName(output);
    output.quantity = 1;
  } else {
    await askFor('Parallel', 'parallel');
    await askFor('Insert', 'insert');
    await askFor('Features (RC, etc)', 'features');
    await askFor('Print Run', 'printRun');
    await askFor('Autographed', 'autographed');
    if (isYes(output.autographed)) {
      await askFor('Autographe Format', 'autoFormat');
    } else {
      output.autoFormat = output.autographed;
    }
    output.title = await getCardTitle(output);
    output.cardName = await getCardName(output);

    await askFor('Quantity', 'quantity');

    skipShipping = await ask('Use Standard Card Size/Shipping?', true);
  }

  if (skipShipping) {
    output.size = 'Standard';
    output.material = 'Card Stock';
    output.thickness = '20pt';
    output.lbs = 0;
    output.oz = 1;
    output.length = 6;
    output.width = 4;
    output.depth = 1;
  } else {
    await askFor('Size', 'size');
    await askFor('Material', 'material');
    await askFor('Thickness', 'thickness');
    await askFor('Weight (lbs)', 'lbs');
    await askFor('Weight (oz)', 'oz');
    await askFor('Length (in)', 'length');
    await askFor('Width (in)', 'width');
    await askFor('Depth (in)', 'depth');
  }

  await askFor('Price', 'price');
  if (output.price === '0.99' || output.price === 0.99) {
    output.autoOffer = '0.01';
  } else if (output.price === '1.99' || output.price < 2.5) {
    output.autoOffer = '1';
  } else {
    await askFor('Auto Accept Offer', 'autoOffer');
    // await askFor('Minimum Offer', 'minOffer');
  }
  output.directory = `${output.year}/${output.setName}${output.insert ? `/${output.insert}` : ''}${output.parallel ? `/${output.parallel}` : ''}/`.replace(/\s/g, '_');
  return output;
}

let cardNumber = 1;
export const getCardData = async (rawImage, allCards, imageDefaults) => {

  //first kick out if we already have data saved for this image


  //find the card number
  if (imageDefaults.cardNumber) {
    cardNumber = imageDefaults.cardNumber;
  }

  if (!allCards[cardNumber]) {
    cardNumber = await ask('Card Number', cardNumber);
  }

  let output = allCards[cardNumber];
  let bumpCardNumber = false;

  //see if we already have that card number
  if (output) {
    output.count = output.count + 1;
    if (output.count > 1) {
      bumpCardNumber = true;
    }
  } else {
    //if we haven't found it yet, lets get the new data!
    output = await getNewCardData(cardNumber, {
      ...output,
      ...imageDefaults
    });

    console.log('Card Info: ', output);
    while (!await confirm('Proceed with card?')) {
      output = await getNewCardData(cardNumber, output);
      console.log('Card Info: ', output);
    }

  }

  output.filename = `${output.cardNumber}_${output.player}_${output.count}.jpg`.replace(/\s/g, '_').replace(/\//g, '_').replace(/\|/g, '_');
  const imgURL = `https://firebasestorage.googleapis.com/v0/b/hofdb-2038e.appspot.com/o/${output.filename}?alt=media`
  output.pics = output.pics.length > 0 ? `${output.pics} | ${imgURL}` : `${imgURL}`;

  allCards[output.cardNumber] = output;
  saveAnswers(allCards);

  if (bumpCardNumber) {
    cardNumber++;
  }

  return output
}

export const cardDataExistsForRawImage = (rawImage, allCards) => {
  if (rawImage && !saveData.setData.reprocessImages) {
    const saved = Object.values(allCards).find(card => card.raw?.includes(rawImage));
    if (saved) {
      return saved;
    }
  }
  return false;
}
