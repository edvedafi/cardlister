import { ask, confirm } from '../utils/ask.js';
import { findLeague, getTeamSelections, sports } from '../utils/teams.js';
import { graders, isNo, isYes } from '../utils/data.js';
import fs from 'fs-extra';

//Set up the card name and track with previous for front/back situations
let answerFile;
const saveData = {
  metadata: {},
  setData: {},
  allCardData: {},
  bulk: [],
};
export const initializeAnswers = async (inputDirectory, readExact = false) => {
  answerFile = `${inputDirectory}input.json`;

  try {
    if (await fs.exists(answerFile)) {
      const answerInput = await fs.readJSON(answerFile);
      // console.log('answerInput', answerInput);

      saveData.metadata = answerInput.metadata;
      saveData.metadata.reprocessImages = readExact ? false : await ask('Reprocess existing images', false);

      saveData.allCardData = readExact
        ? answerInput.allCardData
        : Object.values(answerInput.allCardData)
            .map((card) => ({
              ...card,
              //clear out the pics property because it is appended to every run
              pics: saveData.metadata.reprocessImages ? '' : card.pics,
              //reset the count to 0 if we want to reuse the existing images
              count: saveData.metadata.reprocessImages ? 0 : card.count,
            }))
            .reduce((acc, card) => {
              acc[card.cardNumber] = card;
              return acc;
            }, {});
      saveData.setData = answerInput.setData;
      saveData.bulk = answerInput.bulk;
      // console.log("saveData", saveData);
    }
  } catch (e) {
    console.log(e);
    console.log('No prefilled answers file found');
  }

  return saveData;
};

export const mockSavedSetData = (data) => (saveData.setData = data);

const saveAnswers = (cardData) => {
  if (cardData) {
    saveData.allCardData = cardData;
  }
  fs.writeJSON(answerFile, saveData).catch((e) => {
    console.log('Error saving answers', e);
  });
};
const saveBulkAnswers = (cardData) => {
  if (cardData) {
    saveData.bulk = cardData;
  }
  fs.writeJSON(answerFile, saveData).catch((e) => {
    console.log('Error saving answers', e);
  });
};

export const getSetData = async () => {
  const isSet = await ask('Is this a complete set?', isYes(saveData.setData?.isSet));

  if (isSet) {
    saveData.setData.isSet = true;

    saveData.setData.sport = await ask('Sport', saveData.setData.sport, {
      selectOptions: sports,
    });
    saveData.setData.year = await ask('Year', saveData.setData.year);
    saveData.setData.player = await ask('Player', saveData.setData.player);
    saveData.setData.league = findLeague(saveData.setData.sport);
    saveData.setData.team = await ask('Team', saveData.setData.team, {
      selectOptions: getTeamSelections(saveData.setData.sport),
    });
    saveData.setData.manufacture = await ask('Manufacturer', saveData.setData.manufacture);
    saveData.setData.setName = await ask('Set Name', saveData.setData.setName);
    saveData.setData.insert = await ask('Insert', saveData.setData.insert);
    saveData.setData.parallel = await ask('Parallel', saveData.setData.parallel);
    saveData.setData.features = await ask('Features', saveData.setData.features);
    saveData.setData.printRun = await ask('Print Run', saveData.setData.printRun);
    saveData.setData.autographed = await ask('Autograph', saveData.setData.autographed);

    saveData.setData.graded = await ask('Graded', saveData.setData.graded);

    saveData.setData.card_number_prefix = await ask('Enter Card Number Prefix', saveData.setData.card_number_prefix);
    saveData.setData.price = await ask('Default Price', saveData.setData.price || 0.99);
    saveData.setData.autoOffer = await ask('Default Auto Accept Offer', saveData.setData.autoOffer || 0.01);
    saveData.setData.bscPrice = await ask('BSC Price', saveData.setData.bscPrice || 0.25);
    saveData.setData.slPrice = await ask('SportLots Price', saveData.setData.slPrice || 0.18);
  } else {
    saveData.setData = {};
  }
  saveAnswers();
  return saveData.setData;
};

const add = (info, modifier) => {
  if (info === undefined || info === null || info === '' || isNo(info)) {
    return '';
  } else if (modifier) {
    return ` ${info} ${modifier}`;
  } else {
    return ` ${info}`;
  }
};

const psaGrades = {
  10: 'GEM-MT',
  9.5: 'MINT',
  9: 'MINT',
  8.5: 'NM-MT',
  8: 'NM-MT',
  7.5: 'NM',
  7: 'NM',
  6.5: 'EX-MT',
  6: 'EX-MT',
  5.5: 'EX',
  5: 'EX',
  4.5: 'VG-EX',
  4: 'VG-EX',
  3.5: 'VG',
  3: 'VG',
  2.5: 'G',
  2: 'G',
  1.5: 'PF',
  1: 'PF',
  0.5: 'PF',
  0: 'PO',
};

//try to get to the best 80 character title that we can
async function getCardTitle(output) {
  const maxTitleLength = 80;

  let insert = add(output.insert, 'Insert');
  let parallel = add(output.parallel, 'Parallel');
  let features = add(output.features).replace('|', '');
  let printRun = output.printRun ? ` /${output.printRun}` : '';
  let setName = output.setName
    ? output.setName.startsWith(output.manufacture)
      ? output.setName
      : `${output.manufacture} ${output.setName}`
    : '';
  let teamDisplay = output.teamDisplay;
  let graded = isYes(output.graded) ? ` ${output.grader} ${output.grade} ${psaGrades[output.grade]}` : '';

  output.longTitle = `${output.year} ${setName}${insert}${parallel} #${output.cardNumber} ${output.player} ${teamDisplay}${features}${printRun}${graded}`;
  let title = output.longTitle;
  if (title.length > maxTitleLength && ['Panini', 'Leaf'].includes(output.manufacture)) {
    setName = output.setName;
    title = `${output.year} ${setName}${insert}${parallel} #${output.cardNumber} ${output.player} ${teamDisplay}${features}${printRun}${graded}`;
  }
  if (title.length > maxTitleLength) {
    teamDisplay = output.team.map((team) => team.team).join(' | ');
    title = `${output.year} ${setName}${insert}${parallel} #${output.cardNumber} ${output.player} ${teamDisplay}${features}${printRun}${graded}`;
  }
  if (title.length > maxTitleLength) {
    teamDisplay = output.team.map((team) => team.team).join(' ');
    title = `${output.year} ${setName}${insert}${parallel} #${output.cardNumber} ${output.player} ${teamDisplay}${features}${printRun}${graded}`;
  }
  if (title.length > maxTitleLength) {
    insert = add(output.insert);
    title = `${output.year} ${setName}${insert}${parallel} #${output.cardNumber} ${output.player} ${teamDisplay}${features}${printRun}${graded}`;
  }
  if (title.length > maxTitleLength) {
    parallel = add(output.parallel);
    title = `${output.year} ${setName}${insert}${parallel} #${output.cardNumber} ${output.player} ${teamDisplay}${features}${printRun}${graded}`;
  }
  if (title.length > maxTitleLength) {
    title = `${output.year} ${setName}${insert}${parallel} #${output.cardNumber} ${output.player} ${teamDisplay}${features}${printRun}${graded}`;
  }
  if (title.length > maxTitleLength) {
    title = `${output.year} ${setName}${insert}${parallel} #${output.cardNumber} ${output.player}${features}${printRun}${graded}`;
  }
  if (title.length > maxTitleLength) {
    title = `${output.year} ${setName}${insert}${parallel} #${output.cardNumber} ${output.player}${printRun}${graded}`;
  }

  title = title.replace(/ {2}/g, ' ');

  if (title.length > maxTitleLength) {
    title = await ask(`Title`, output.longTitle, { maxLength: maxTitleLength });
  }

  return title;
}

async function getLotTitle(output) {
  const maxTitleLength = 80;

  let lotCount = output.lotCount > 1 ? ` (Lot #${output.lotCount})` : '';
  let teamDisplay = output.teamDisplay;

  const updateTitle = () =>
    `25 Card ${output.lotType} Lot: ${output.player} ${teamDisplay}${lotCount}`.replace(/ {2}/g, ' ');

  output.longTitle = updateTitle();
  let title = output.longTitle;
  if (title.length > maxTitleLength + 3 && lotCount) {
    lotCount = ` Lot ${output.lotCount}`;
    title = updateTitle();
  }
  if (title.length > maxTitleLength && lotCount) {
    lotCount = ` #${output.lotCount}`;
    title = updateTitle();
  }
  if (title.length > maxTitleLength && output.team.length > 0) {
    teamDisplay = output.team.map((team) => team.team).join(' | ');
    title = updateTitle();
  }
  if (title.length > maxTitleLength && output.team.length > 0) {
    teamDisplay = output.team.map((team) => team.team).join(' ');
    title = updateTitle();
  }

  if (title.length > maxTitleLength) {
    return await ask(`Title`, title, { maxLength: maxTitleLength });
  } else {
    return title;
  }
}

async function getCardName(output) {
  //generate a 60 character card name
  const maxCardNameLength = 60;
  let cardName = output.title.replace(' | ', ' ');
  let insert = add(output.insert);
  let parallel = add(output.parallel);
  if (cardName.length > maxCardNameLength) {
    cardName = `${output.year} ${output.manufacture} ${output.setName}${insert}${parallel} ${output.player}`.replace(
      ' | ',
      ' ',
    );
  }
  if (cardName.length > maxCardNameLength) {
    cardName = `${output.year} ${output.setName}${insert}${parallel} ${output.player}`.replace(' | ', ' ');
  }
  if (cardName.length > maxCardNameLength) {
    cardName = `${output.year} ${output.setName}${insert}${parallel}`;
  }
  if (cardName.length > maxCardNameLength) {
    cardName = `${output.setName}${insert}${parallel}`;
  }
  cardName = cardName.replace(/ {2}/g, ' ').replace(' | ', ' ');

  if (cardName.length > maxCardNameLength) {
    cardName = await ask('Card Name', cardName, {
      maxLength: maxCardNameLength,
    });
  }

  return cardName;
}

const findStoreCategory = (sport) => {
  return { baseball: '10796384017', football: '10796385017' }[sport] || '10796387017';
};

export async function addCardData(text, output, propName, defaultValues, options) {
  if (saveData?.setData && saveData?.setData[propName] && !options?.allowUpdates) {
    if (!isNo(saveData?.setData[propName])) {
      output[propName] = saveData?.setData[propName];
    }
  } else {
    const defaultValue = defaultValues[propName] ? defaultValues[propName].display || defaultValues[propName] : '';
    output[propName] = await ask(text, defaultValue, options);
  }
}

async function getNewCardData(cardNumber, defaults = {}, resetAll) {
  const defaultValues = {
    sport: 'football',
    quantity: 1,
    price: 0.99,
    graded: false,
    autographed: false,
    // grade: "Not Graded",
    // grader: "Not Graded",
    ...defaults,
  };
  let output = {
    ...defaultValues,
    cardNumber:
      saveData.setData.card_number_prefix && !cardNumber.startsWith(saveData.setData.card_number_prefix)
        ? `${saveData.setData.card_number_prefix}${cardNumber}`
        : cardNumber,
    count: 1,
    pics: [],
  };

  const askFor = async (text, propName, options) => await addCardData(text, output, propName, defaultValues, options);

  await askFor('Sport', 'sport', {
    selectOptions: sports,
    allowUpdates: resetAll,
  });
  output.league = findLeague(output.sport);
  output.storeCategory = findStoreCategory(output.sport);
  await askFor('Player/Card Name', 'player', { allowUpdates: resetAll });
  await askFor('Year', 'year', { allowUpdates: resetAll });
  output.team = await getTeam(output);
  output.teamDisplay = getTeamDisplay(output.team);
  await askFor('Manufacturer', 'manufacture', { allowUpdates: resetAll });
  await askFor('Set Name', 'setName', { allowUpdates: resetAll });

  let skipShipping = await ask('Is base card?', true, {
    allowUpdates: resetAll,
  });

  if (skipShipping) {
    output.title = await getCardTitle(output);
    output.cardName = await getCardName(output);
    output.quantity = 1;
  } else {
    await askFor('Parallel', 'parallel', { allowUpdates: skipShipping || resetAll });
    await askFor('Insert', 'insert', { allowUpdates: skipShipping || resetAll });
    await askFor('Features (RC, etc)', 'features', { allowUpdates: skipShipping || resetAll });
    await askFor('Print Run', 'printRun', { allowUpdates: skipShipping || resetAll });
    await askFor('Autographed', 'autographed', { allowUpdates: skipShipping || resetAll });
    if (isYes(output.autographed)) {
      await askFor('Autograph Format', 'autoFormat', {
        allowUpdates: skipShipping || resetAll,
        selectOptions: ['Label or Sticker', 'On Card', 'Cut Signature'],
      });
    } else {
      output.autoFormat = output.autographed;
    }

    await askFor('Graded', 'graded', { allowUpdates: resetAll });
    if (isYes(output.graded)) {
      await askFor('Grader', 'grader', { selectOptions: graders });
      await askFor('Grade', 'grade', { allowUpdates: resetAll });
      await askFor('Cert Number', 'certNumber', { allowUpdates: resetAll });
    }

    output.title = await getCardTitle(output);
    output.cardName = await getCardName(output);

    skipShipping = await ask('Use Standard Card Size/Shipping?', true);
  }
  await askFor('Quantity', 'quantity', { allowUpdates: resetAll });

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
    // noinspection DuplicatedCode
    await askFor('Size', 'size', { allowUpdates: resetAll });
    await askFor('Material', 'material', { allowUpdates: resetAll });
    await askFor('Thickness', 'thickness', { allowUpdates: resetAll });
    await askFor('Weight (lbs)', 'lbs', { allowUpdates: resetAll });
    await askFor('Weight (oz)', 'oz', { allowUpdates: resetAll });
    await askFor('Length (in)', 'length', { allowUpdates: resetAll });
    await askFor('Width (iyeah)', 'width', { allowUpdates: resetAll });
    await askFor('Depth (in)', 'depth', { allowUpdates: resetAll });
  }

  await askFor('Price', 'price', { allowUpdates: true });
  if (output.price === '0.99' || output.price === 0.99) {
    output.autoOffer = '0.01';
  } else if (output.price === '1.99' || output.price < 2.5) {
    output.autoOffer = '1';
  } else {
    await askFor('Auto Accept Offer', 'autoOffer', { allowUpdates: true });
    // await askFor('Minimum Offer', 'minOffer');
  }

  //inserts, parallels or cards worth more than $1 default to 10% of the Ebay price otherwise drop it to a quarter
  if (output.insert || output.parallel || output.price > 1) {
    output.bscPrice = Math.round(output.price * 10) / 100;
    output.slPrice = Math.round(output.price * 10) / 100;
  } else {
    output.bscPrice = 0.25;
    output.slPrice = 0.18;
  }
  await askFor('BSC Price', 'bscPrice', { allowUpdates: true });
  await askFor('SportLots Price', 'slPrice', { allowUpdates: true });

  output.directory = `${output.year}/${output.setName}${output.insert ? `/${output.insert}` : ''}${
    output.parallel ? `/${output.parallel}` : ''
  }/`.replace(/\s/g, '_');
  return output;
}

let cardNumber = 1;
export const getCardData = async (allCards, imageDefaults) => {
  //first kick out if we already have data saved for this image

  //find the card number
  if (imageDefaults.cardNumber) {
    cardNumber = imageDefaults.cardNumber;
  }

  if (!cardNumber) {
    cardNumber = await ask('Card Number', cardNumber);
  }

  let output = allCards[imageDefaults.key || cardNumber];

  //see if we already have that card number
  if (output) {
    output.count = output.count + 1;
  } else {
    //if we haven't found it yet, lets get the new data!
    output = await getNewCardData(cardNumber, {
      key: imageDefaults.key || cardNumber,
      ...imageDefaults,
      ...output,
    });

    console.log('Card Info: ', output);
    while (!(await confirm('Proceed with card?'))) {
      output = await getNewCardData(cardNumber, output, true);
      console.log('Card Info: ', output);
    }
  }

  output.filename = `${output.cardNumber}_${output.player}_${output.count}.jpg`
    .replace(/\s/g, '_')
    .replace(/\//g, '_')
    .replace(/\|/g, '_');
  if (output.count === 1) {
    output.frontImage = output.filename;
  } else if (output.count === 2) {
    output.backImage = output.filename;
  }

  const imgURL = `https://firebasestorage.googleapis.com/v0/b/hofdb-2038e.appspot.com/o/${output.filename}?alt=media`;
  output.pics = output.pics.length > 0 ? `${output.pics} | ${imgURL}` : `${imgURL}`;

  allCards[output.key] = output;
  saveAnswers(allCards);

  return output;
};

export const getBulkCardData = async (bulkCards, setData, enterValues, lastCardNumber) => {
  const defaultValues = {
    quantity: 1,
    bscPrice: 0.25,
    slPrice: 0.18,
    ...setData,
  };

  if (setData.card_number_prefix) {
    const prefixIndex = lastCardNumber.indexOf(setData.card_number_prefix);
    if (lastCardNumber && lastCardNumber !== 'start') {
      try {
        // console.log('prefixIndex', prefixIndex);
        // console.log('lastCardNumber', lastCardNumber);
        // console.log('lastCardNumber.substring(prefixIndex + 1)', lastCardNumber.substring(prefixIndex + 1));
        cardNumber =
          setData.card_number_prefix +
          (Number.parseInt(prefixIndex === -1 ? lastCardNumber : lastCardNumber.substring(prefixIndex + 3)) + 1);
      } catch (e) {
        /*burying the exception because we don't care if it fails*/
      }
    }
    cardNumber = await ask(`Card Number (${setData.card_number_prefix})`, cardNumber);
    if (cardNumber && !cardNumber?.toString().startsWith(setData.card_number_prefix)) {
      cardNumber = `${setData.card_number_prefix}${cardNumber}`;
    }
  } else {
    if (lastCardNumber !== 'start') {
      try {
        cardNumber = Number.parseInt(lastCardNumber) + 1;
      } catch (e) {
        /*burying the exception because we don't care if it fails*/
      }
    }
    cardNumber = await ask(`Card Number`, cardNumber);
  }

  if (cardNumber) {
    const output = {
      ...setData,
      cardNumber: cardNumber,
    };

    const askFor = async (text, propName) =>
      await addCardData(text, output, propName, defaultValues, { allowUpdates: enterValues });

    await askFor('Quantity', 'quantity');
    await askFor('BSC Price', 'bscPrice');
    await askFor('SL Price', 'slPrice');

    bulkCards.push(output);

    saveBulkAnswers(bulkCards);
  }

  return cardNumber;
};

export const getTeam = async (defaults) => {
  const teams = [];
  let defaultTeam;
  if (defaults.team) {
    if (typeof defaults.team === 'string') {
      defaultTeam = defaults.team;
    } else if (defaults.team.searchExact) {
      defaultTeam = defaults.team.searchExact;
    } else if (defaults.team.length === 1 && defaults.team[0] && defaults.team[0].searchExact) {
      defaultTeam = defaults.team[0].searchExact;
    }
  }
  let newTeam = await ask('Teams', defaultTeam, {
    selectOptions: getTeamSelections(defaults.sport),
  });
  while (newTeam) {
    teams.push(newTeam);
    newTeam = await ask('Teams', undefined, {
      selectOptions: getTeamSelections(defaults.sport),
    });
  }
  return teams;
};

export const getTeamDisplay = (teams) =>
  teams?.reduce((display, team) => (display?.length > 0 ? `${display} | ${team.display}` : team.display), undefined);

export const cardDataExistsForRawImage = (rawImage, allCards) => {
  if (rawImage && !saveData.setData.reprocessImages) {
    const saved = Object.values(allCards).find((card) => card.raw?.includes(rawImage));
    if (saved) {
      return saved;
    }
  }
  return false;
};

export const getLotData = async (imageDefaults, allCards) => {
  let output = {
    sport: 'football',
    quantity: 1,
    price: 5,
    autoOffer: 3,
    category: '261329',
    storeCategory: '37612238017',
    count: 1,
    pics: [],
    size: 'Standard',
    material: 'Card Stock',
    thickness: '20pt',
    lbs: 0,
    oz: 3,
    length: 6,
    width: 4,
    depth: 1,
    numberOfCards: 25,
    year: '1989',
    ...imageDefaults,
  };

  const askFor = async (text, propName, options) => {
    await addCardData(text, output, propName, output, options);
  };

  await askFor('Sport', 'sport', { selectOptions: sports });
  output.league = findLeague(output.sport);
  output.manufacture = output.sport === 'baseball' ? 'Topps' : 'Panini';
  await askFor('Player/Card Name', 'player');
  output.team = await getTeam(output);
  output.teamDisplay = getTeamDisplay(output.team);
  await askFor('Quantity', 'quantity');

  const skipShipping = await ask('Use Standard Lot Size,Shipping, Price?', true);

  if (!skipShipping) {
    await askFor('Oldest Card', 'year');
    // noinspection DuplicatedCode
    await askFor('Size', 'size');
    await askFor('Material', 'material');
    await askFor('Thickness', 'thickness');
    await askFor('Weight (lbs)', 'lbs');
    await askFor('Weight (oz)', 'oz');
    await askFor('Length (in)', 'length');
    await askFor('Width (in)', 'width');
    await askFor('Depth (in)', 'depth');
    await askFor('Price', 'price');
    if (output.price !== 5 && output.price !== '5') {
      await askFor('Auto Accept Offer', 'autoOffer');
    }
  }

  const playerKey = output.player.replace(/\s/g, '_');
  output.directory = `${output.lotType}_Lots/${playerKey}/`.replace(/\s/g, '_');

  output.lotCount = 1;
  output.key = `${playerKey}_${output.lotCount}`;
  const keyExists = async () => allCards[output.key] || (await fs.pathExists(`${output.directory}/${output.key}`));
  while ((await keyExists()) && output.lotCount < 99) {
    output.key = `${playerKey}_${++output.lotCount}`;
  }
  output.filename = `${output.key}.jpg`;
  output.title = await getLotTitle(output);

  const imgURL = `https://firebasestorage.googleapis.com/v0/b/hofdb-2038e.appspot.com/o/${output.filename}?alt=media`;
  output.pics = output.pics.length > 0 ? `${output.pics} | ${imgURL}` : `${imgURL}`;

  output.description = `${output.longTitle}<br><br>Typically these lots contain base cards, lower end RCs, and lower end inserts. You are not necessarily getting the exact cards pictured as I have multiple lots for every player and just list with quantities. If you are interested in the player and want to ensure you get specifically one or more of the cards pictured please message me so that I can ensure you get those cards.<br><br>Please note I try to make these lots are all unique cards, but sometimes I am not perfect at that.`;

  allCards[output.key] = output;

  console.log(output);
  saveAnswers(allCards);

  return output;
};

//Troy Aikman
