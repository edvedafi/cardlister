import {ask, confirm} from "./ask.mjs";
import {findLeague, findTeam, sports} from "./utils/teams.mjs";
import {isNo, isYes} from "./utils/data.mjs";

//Set up the card name and track with previous for front/back situations
let card_number_prefix = '';
let cardNumber, year, setName, sport, insert, parallel, features, manufacture, printRun, autographed;

export const getSetData = async () => {
  const isSet = isYes(await ask('Is this a complete set?'));

  //Set up an prefixes to the card title
  if (isSet) {
    sport = await ask('Sport', 'Football', {selectOptions: sports});
    year = await ask('Year');
    manufacture = await ask('Manufacturer');
    setName = await ask('Set Name');
    insert = await ask('Insert');
    parallel = await ask('Parallel');
    features = await ask('Features');
    printRun = await ask('Print Run');
    autographed = await ask('Autograph');

    card_number_prefix = await ask('Enter Card Number Prefix');
  }
}

//try to get to the best 80 character title that we can
async function getCardTitle(output) {
  const maxTitleLength = 80;
  let longTitle = `${output.year} ${output.setName} ${output.insert ? ` ${output.insert} Insert` : ''} ${output.parallel ? `${output.parallel} parallel ` : ''} #${output.cardNumber} ${output.player} ${output.team} ${output.features} ${output.printRun ? `/${output.printRun}` : ''}`;
  let title = longTitle;
  if (title.length > maxTitleLength) {
    title = `${output.year} ${output.setName} ${output.insert} ${output.parallel} #${output.cardNumber} ${output.player} ${output.team} ${output.features} ${output.printRun ? `/${output.printRun}` : ''}`;
  }
  if (title.length > maxTitleLength) {
    title = `${output.year} ${output.setName} ${output.insert} ${output.parallel} #${output.cardNumber} ${output.player} ${output.teamName} ${output.features} ${output.printRun ? `/${output.printRun}` : ''}`;
  }
  if (title.length > maxTitleLength) {
    title = `${output.year} ${output.setName} ${output.insert} ${output.parallel} #${output.cardNumber} ${output.player} ${output.features} ${output.printRun ? `/${output.printRun}` : ''}`;
  }
  if (title.length > maxTitleLength) {
    title = `${output.year} ${output.setName} ${output.insert} ${output.parallel} ${output.player} ${output.features} ${output.printRun ? `/${output.printRun}` : ''}`;
  }

  title = title.replace(/  /g, ' ');

  return await ask(`Title`, title, {maxLength: maxTitleLength});
}

async function getCardName(output) {
  //generate a 60 character card name
  const maxCardNameLength = 60;
  let cardName = output.title;
  if (cardName > maxCardNameLength) {
    output.cardName = `${output.year} ${output.manufacture} ${output.setName}${output.insert ? ` ${output.insert}` : ' '}${output.parallel ? `${output.parallel} ` : ''} ${output.player}`;
  }
  if (cardName > maxCardNameLength) {
    output.cardName = `${output.setName}${output.insert ? ` ${output.insert}` : ' '}${output.parallel ? `${output.parallel} ` : ''} ${output.player}`;
  }
  if (cardName > maxCardNameLength) {
    output.cardName = `${output.setName}${output.insert ? ` ${output.insert}` : ' '}${output.parallel ? `${output.parallel} ` : ''}`;
  }
  if (cardName > maxCardNameLength && output.insert) {
    output.cardName = `${output.insert ? ` ${output.insert}` : ' '}${output.parallel ? `${output.parallel} ` : ''}`;
  } else {
    output.cardName = `${output.setName} ${output.parallel ? `${output.parallel} ` : ''}`;
  }
  output.cardName = output.cardName.replace(/  /g, ' ');
  return await ask('Card Name', output.cardName, {maxLength: maxCardNameLength});
}

async function getNewCardData(cardNumber, defaults = {}) {
  let output = {
    cardNumber: `${card_number_prefix}${cardNumber}`,
    count: 1,
    pics: []
  };

  output.sport = sport || await ask('Sport', defaults.sport || 'football', {selectOptions: sports});
  output.league = findLeague(output.sport);
  output.player = await ask('Player/Card Name', defaults.player);
  [output.team, output.teamName] = findTeam(await ask('Team', defaults.team), output.sport);
  output.year = year || await ask('Year', defaults.year);
  output.manufacture = manufacture || await ask('Manufacturer', defaults.manufacture);
  output.setName = setName || await ask('Set Name', defaults.setName);
  if (!isNo(parallel)) {
    output.parallel = parallel || await ask('Parallel', defaults.parallel);
  }
  if (parallel === 'base') {
    output.parallel = undefined;
  }
  if (!isNo(insert)) {
    output.insert = insert || await ask('Insert', defaults.insert);
  }
  output.features = features || await ask('Features (RC, etc)', defaults.features);

  if (!isNo(printRun)) {
    output.printRun = await ask('Print Run', defaults.printRun);
  }

  if (!isNo(autographed)) {
    output.autographed = await ask('Autographed', defaults.autographed);
    if (isYes(output.autographed)) {
      output.autoFormat = await ask('Autograph Format', defaults.autoFormat || 'On Card');
    }
  }

  output.title = await getCardTitle(output);
  output.cardName = await getCardName(output);

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


  output.price = await ask('Price', defaults.price || '0.99');
  if (output.price === '0.99') {
    output.autoOffer = '0.01';
    output.minOffer = '0.01';
  } else {
    output.autoOffer = await ask('Auto Accept Offer', defaults.autoOffer);
    output.minOffer = await ask('Minimum Offer', defaults.minOffer);
  }
  output.directory = `${output.year}/${output.setName}${output.insert ? `/${output.insert}` : ''}${output.parallel ? `/${output.parallel}` : ''}/`.replace(/\s/g, '_');
  return output;
}

export const getCardData = async (allCards) => {
  cardNumber = await ask('Card Number', cardNumber);
  let output = allCards[cardNumber];

  if (output) {
    output.count = output.count + 1;
  } else {
    output = await getNewCardData(cardNumber);

    console.log('Card Info: ', output);
    while (!await confirm('Proceed with card?')) {
      output = await getNewCardData(cardNumber, output);
      console.log('Card Info: ', output);
    }

  }

  output.filename = `${card_number_prefix}${cardNumber}_${output.player}_${output.count}.jpg`.replace(/\s/g, '_').replace(/\//g, '_').replace(/\|/g, '_');
  const imgURL = `https://firebasestorage.googleapis.com/v0/b/hofdb-2038e.appspot.com/o/${output.filename}?alt=media`
  output.pics = output.pics.length > 0 ? `${output.pics} | ${imgURL}` : `${imgURL}`;

  allCards[cardNumber] = output;

  return output
}
