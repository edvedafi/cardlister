import {ask} from "./ask.mjs";
import {findLeague, findTeam} from "./utils/teams.mjs";
import {isNo, isYes} from "./utils/data.mjs";

//Set up the card name and track with previous for front/back situations
let card_number_prefix = '';
let cardNumber, year, setName, sport, insert, parallel, features, manufacture;

export const getSetData = async () => {
  const isSet = isYes(await ask('Is this a complete set?'));

  //Set up an prefixes to the card title
  if (isSet) {
    sport = await ask('Sport');
    year = await ask('Year');
    manufacture = await ask('Manufacturer');
    setName = await ask('Set Name');
    insert = await ask('Insert');
    parallel = await ask('Parallel');
    features = await ask('Features');

    card_number_prefix = await ask('Enter Card Number Prefix');
  }
}

async function getCardTitle(output) {
  //try to get to the best 80 character title that we can
  const maxTitleLength = 80;
  const addProp = (prop) => prop ? ` ${prop}` : '';
  let title = `${output.year} ${output.setName}${output.insert ? ` ${output.insert} Insert` : ' '}${output.parallel ? `${output.parallel} parallel` : ''} #${output.cardNumber} ${output.player} ${output.team} ${output.features}${output.printRun ? ` /${output.printRun}` : ''}`;
  if (title.length > maxTitleLength) {
    title = `${output.year} ${output.setName}${output.insert ? ` ${output.insert}` : ''}${output.parallel ? `${output.parallel} ` : ' '}#${output.cardNumber} ${output.player} ${output.team} ${output.features}${output.printRun ? ` /${output.printRun}` : ''}`;
  }
  if (title.length > maxTitleLength) {
    title = `${output.year} ${output.setName}${output.insert ? ` ${output.insert}` : ''}${output.parallel ? ` ${output.parallel} ` : ' '}#${output.cardNumber} ${output.player} ${output.team.slice(output.team.lastIndexOf(' '))} ${output.features}${output.printRun ? ` /${output.printRun}` : ''}`;
  }
  if (title.length > maxTitleLength) {
    title = `${output.year} ${output.setName}${output.insert ? ` ${output.insert}` : ''}${output.parallel ? ` ${output.parallel} ` : ' '}#${output.cardNumber} ${output.player} ${output.team.slice(output.team.indexOf(' '))} ${output.features}${output.printRun ? ` /${output.printRun}` : ''}`;
  }
  if (title.length > maxTitleLength) {
    title = `${output.year} ${output.setName}${output.insert ? ` ${output.insert}` : ''}${output.parallel ? ` ${output.parallel} ` : ' '}#${output.cardNumber} ${output.player} ${output.team.slice(output.team.indexOf(' '))}${output.printRun ? ` /${output.printRun}` : ''}`;
  }

  title = title.replace(/  /g, ' ');

  return await ask(`Title`, title, maxTitleLength);
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
  return await ask('Card Name', output.cardName, maxCardNameLength);
}

export const getCardData = async (allCards) => {
  cardNumber = await ask('Card Number', cardNumber);
  let output = allCards[cardNumber];

  if (output) {
    output.count = output.count + 1;
  } else {
    output = {
      cardNumber: `${card_number_prefix}${cardNumber}`,
      count: 1,
      pics: []
    };

    output.sport = sport || await ask('Sport');
    output.league = findLeague(output.sport);
    output.player = await ask('Player/Card Name');
    output.team = findTeam(await ask('Team'), output.sport);
    output.league = findLeague(output.sport);
    output.year = year || await ask('Year');
    output.manufacture = manufacture || await ask('Manufacturer');
    output.setName = setName || await ask('Set Name');
    if (!isNo(parallel)) {
      output.parallel = parallel || await ask('Parallel');
    }
    if (parallel === 'base') {
      output.parallel = undefined;
    } else {
      if (!isNo(insert)) {
        output.insert = insert || await ask('Insert');
      }
      output.features = features || await ask('Features (RC, etc)');
      output.printRun = await ask('Print Run');
      output.autographed = await ask('Autographed');
      if (isYes(output.autographed)) {
        output.autoFormat = await ask('Autograph Format', 'On Card');
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


    output.price = await ask('Price', '0.99');
    output.autoOffer = await ask('Auto Accept Offer');
    output.minOffer = await ask('Minimum Offer');

  }

  output.directory = `${output.year}/${output.setName}${output.insert ? `/${output.insert}` : ''}${output.parallel ? `/${output.parallel}` : ''}/`.replace(/\s/g, '_');
  output.filename = `${card_number_prefix}${cardNumber}_${output.player}_${output.count}.jpg`.replace(/\s/g, '_').replace(/\//g, '_').replace(/\|/g, '_');
  const imgURL = `https://firebasestorage.googleapis.com/v0/b/hofdb-2038e.appspot.com/o/${output.filename}?alt=media`
  output.pics = output.pics.length > 0 ? `${output.pics} | ${imgURL}` : `${imgURL}`;

  allCards[cardNumber] = output;

  return output
}
