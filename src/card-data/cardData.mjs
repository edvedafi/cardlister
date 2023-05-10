import {ask, confirm} from "../utils/ask.mjs";
import {findLeague, findTeam, sports} from "../utils/teams.mjs";
import {isNo, isYes} from "../utils/data.mjs";
import getTextFromImage from "./imageRecognition.js";

//Set up the card name and track with previous for front/back situations
let answerFile;
const saveData = {
  metadata: {},
  setData: {},
  allCardData: []
}
export const initializeAnswers = async (inputDirectory) => {
  answerFile = `${inputDirectory}input.json`;

  try {
    const answerInput = await fs.readJSON(answerFile);

    saveData.metadata = answerInput.metadata;
    saveData.metadata.reprocessImages = await ask('Reprocess existing images', false);

    saveData.allCardData = answerInput.allCardData?.map(card => ({
      ...card,
      //clear out the pics property because it is appended to every run
      pics: '',
      //reset the count to 0 if we want to reuse the existing images
      count: saveData.metadata.reprocessImages ? card.count : 0,
    }));
    saveData.setData = answerInput.setData;
  } catch (e) {
    console.log('No prefilled answers file found');
  }

  return saveData;
}

const saveAnswers = (cardData) => {
  if (cardData) {
    saveData.allCardData = cardData;
  }
  fs.writeJSON(answerFile, saveData).catch((e) => {
    console.log('Error saving answers', e);
  });
}

export const getSetData = async () => {
  const isSet = await ask('Is this a complete set?', saveData.setData.isSet || false);

  //Set up an prefixes to the card title
  if (isSet) {
    if (!saveData.setData.isSet) {
      saveData.setData.sport = await ask('Sport', saveData.setData.sport || 'Football', {selectOptions: sports});
      saveData.setData.year = await ask('Year', saveData.setData.year);
      saveData.setData.manufacture = await ask('Manufacturer', saveData.setData.manufacture);
      saveData.setData.setName = await ask('Set Name', saveData.setData.setName);
      saveData.setData.insert = await ask('Insert (enter No to skip)', saveData.setData.insert);
      saveData.setData.parallel = await ask('Parallel (enter No to skip)', saveData.setData.parallel);
      saveData.setData.features = await ask('Features', saveData.setData.features);
      saveData.setData.printRun = await ask('Print Run (enter No to skip)', saveData.setData.printRun);
      saveData.setData.autographed = await ask('Autograph (enter No to skip)', saveData.setData.autographed);

      saveData.setData.card_number_prefix = await ask('Enter Card Number Prefix', saveData.setData.card_number_prefix);
      saveData.setData.price = await ask('Default Price', saveData.setData.price);
      saveData.setData.autoOffer = await ask('Default Auto Accept Offer', saveData.setData.autoOffer);
    }
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

async function getNewCardData(cardNumber, defaults = {}) {
  let output = {
    cardNumber: `${saveData.setData.card_number_prefix}${cardNumber}`,
    count: 1,
    pics: []
  };

  output.sport = saveData?.setData?.sport || await ask('Sport', defaults.sport || 'football', {selectOptions: sports});
  output.league = findLeague(output.sport);
  output.player = await ask('Player/Card Name', defaults.player);
  [output.team, output.teamName] = findTeam(await ask('Team', defaults.team), output.sport);
  output.year = saveData?.setData?.year || await ask('Year', defaults.year);
  output.manufacture = saveData?.setData?.manufacture || await ask('Manufacturer', defaults.manufacture);
  output.setName = saveData?.setData?.setName || await ask('Set Name', defaults.setName);
  if (!isNo(saveData?.setData?.parallel)) {
    output.parallel = saveData?.setData?.parallel || await ask('Parallel', defaults.parallel);
  }
  if (saveData?.setData?.parallel === 'base') {
    output.parallel = undefined;
  }
  if (!isNo(saveData?.setData?.insert)) {
    output.insert = saveData?.setData?.insert || await ask('Insert', defaults.insert);
  }
  output.features = saveData?.setData?.features || await ask('Features (RC, etc)', defaults.features);

  if (!isNo(saveData?.setData?.printRun)) {
    output.printRun = await ask('Print Run', defaults.printRun);
  }

  if (!isNo(saveData?.setData?.autographed)) {
    output.autographed = await ask('Autographed', defaults.autographed);
    if (isYes(output.autographed)) {
      output.autoFormat = await ask('Autograph Format', defaults.autoFormat || 'On Card');
    }
  }

  output.title = await getCardTitle(output);
  output.cardName = await getCardName(output);

  output.quantity = await ask('Quantity', defaults.quantity || 1);

  const skipShipping = await ask('Use Standard Card Size/Shipping?', 'Y');

  if (isYes(skipShipping)) {
    output.size = 'Standard';
    output.material = 'Card Stock';
    output.thickness = '20pt';
    output.lbs = 0;
    output.oz = 1;
    output.length = 6;
    output.width = 4;
    output.depth = 1;
  } else {
    output.size = await ask('Size', 'Standard');
    output.material = await ask('Material', 'Card Stock');
    output.thickness = await ask('Thickness', '20pt');
    output.lbs = await ask('Weight (lbs)', '0');
    output.oz = await ask('Weight (oz)', '1');
    output.length = await ask('Length (in)', '6');
    output.width = await ask('Width (in)', '4');
    output.depth = await ask('Depth (in)', '1');
  }


  output.price = await ask('Price', saveData?.setData?.price || defaults.price || '0.99');
  if (output.price === '0.99') {
    output.autoOffer = '0.01';
    // output.minOffer = '0.01';
  } else {
    output.autoOffer = await ask('Auto Accept Offer', saveData?.setData?.price || defaults.autoOffer);
    // output.minOffer = await ask('Minimum Offer', defaults.minOffer);
  }
  output.directory = `${output.year}/${output.setName}${output.insert ? `/${output.insert}` : ''}${output.parallel ? `/${output.parallel}` : ''}/`.replace(/\s/g, '_');
  return output;
}

let cardNumber = 1;
export const getCardData = async (allCards, imageDefaults) => {
  if (imageDefaults.cardNumber) {
    cardNumber = imageDefaults.cardNumber;
  }
  cardNumber = await ask('Card Number', cardNumber);
  let output = allCards[cardNumber];
  let bumpCardNumber = false;

  if (output) {
    output.count = output.count + 1;
    if (output.count > 1) {
      bumpCardNumber = true;
    }
  } else {
    output = await getNewCardData(cardNumber, imageDefaults);

    console.log('Card Info: ', output);
    while (!await confirm('Proceed with card?')) {
      output = await getNewCardData(cardNumber, output);
      console.log('Card Info: ', output);
    }

  }

  output.filename = `${output.cardNumber}_${output.player}_${output.count}.jpg`.replace(/\s/g, '_').replace(/\//g, '_').replace(/\|/g, '_');
  const imgURL = `https://firebasestorage.googleapis.com/v0/b/hofdb-2038e.appspot.com/o/${output.filename}?alt=media`
  output.pics = output.pics.length > 0 ? `${output.pics} | ${imgURL}` : `${imgURL}`;

  allCards[cardNumber] = output;
  saveAnswers(allCards);

  if (bumpCardNumber) {
    cardNumber++;
  }

  return output
}
