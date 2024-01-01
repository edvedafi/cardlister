import { getFirestore } from '../utils/firebase.js';
import chalk from 'chalk';
import { reverseTitle } from './ebay.js';
import { convertTitleToCard } from './sportlots.js';
import { ask } from '../utils/ask.js';
import { findLeague, findTeamInString, sports } from '../utils/teams.js';
import { titleCase } from '../utils/data.js';
import { useSpinners } from '../utils/spinners.js';

const color = chalk.yellow;
const log = (...params) => console.log(color(...params));
const { showSpinner, finishSpinner, updateSpinner, errorSpinner } = useSpinners('firebase', color);

export async function uploadToFirebase(allCards) {
  console.log(chalk.magenta('Firebase Starting Upload'));
  const db = getFirestore();
  const collection = db.collection('CardSales');
  let count = 0;
  for (const card of Object.values(allCards)) {
    await collection.doc(card.sku).set({
      sport: card.sport,
      quantity: card.quantity,
      price: card.price,
      bscPrice: card.bscPrice,
      slPrice: card.slPrice,
      title: card.title,
      year: card.year,
      setName: card.setName,
      parallel: card.parallel,
      insert: card.insert,
      cardNumber: card.cardNumber,
      graded: card.graded,
      key: card.key,
      player: card.player,
      team: card.team,
      printRun: card.printRun,
      league: card.league,
      features: card.features,
      longTitle: card.longTitle,
      cardName: card.cardName,
      sku: card.sku,
      bin: card.bin,
    });
    count++;
  }
  if (count === allCards.length) {
    console.log(chalk.magenta('Successfully added'), chalk.green(count), chalk.magenta('cards to Firebase'));
  } else {
    console.log(
      chalk.magenta('Only added'),
      chalk.red(count),
      chalk.magenta('of'),
      chalk.red(allCards.length),
      chalk.magenta('cards to Firebase'),
    );
  }
}

export async function uploadOldListings() {
  console.log(chalk.magenta('Firebase Starting Upload'));
  const db = getFirestore();
  const oldListings = [];

  let finishReadingCsv;
  const readCsv = new Promise((resolve, reject) => {
    finishReadingCsv = resolve;
  });

  const csv = fs.readFileSync('oldListings.csv', { encoding: 'utf-8' }).split('\n');
  let idIndex = 0;
  let quantityIndex = 0;
  let titleIndex = 0;
  for (const line of csv) {
    const cvsLine = line.split(',');
    if (cvsLine[0].trim() === 'id') {
      quantityIndex = cvsLine.indexOf('Available quantity');
      titleIndex = cvsLine.indexOf('Title');
    } else if (cvsLine[idIndex] && cvsLine[idIndex].trim().length > 0) {
      const card = {
        ItemID: cvsLine[idIndex].trim(),
        quantity: parseInt(cvsLine[quantityIndex].replace("'", '').replace('"', '').trim()),
        Title: cvsLine[titleIndex].trim(),
        ...reverseTitle(cvsLine[titleIndex].trim()),
      };
      if (card.cardNumber && card.cardNumber.length > 0) {
        oldListings.push(card);
      } else {
        console.log('skipping', chalk.red(card.Title));
      }
    }
  }

  const collection = db.collection('OldSales');

  for (const card of oldListings) {
    console.log('adding', card);
    await collection.doc(card.ItemID).set(card);
  }
}

export async function updateSport(db) {
  const listings = [];
  const query = db.collection('OldSales').where('sport', '!=', 'Football');
  const queryResults = await query.get();
  const collection = db.collection('OldSales');
  queryResults.forEach((doc) => {
    listings.push(doc.data());
  });

  for (const listing of listings) {
    if (await ask(`Should ${chalk.bold(chalk.cyan(listing.Title))} be football?`, false)) {
      await collection.doc(listing.ItemID).set({ sport: 'Football' }, { merge: true });
    }
  }
}

export function mergeFirebaseResult(card, match) {
  let updatedCard = { ...card };
  //this looks stupid, but firebase returns empty strings, which will overwrite good data.
  if (match) {
    if (match.title) {
      updatedCard.title = match.title;
    }
    if (match.insert) {
      updatedCard.insert = match.insert;
    }
    if (match.parallel) {
      updatedCard.parallel = match.parallel;
    }
    if (match.sport) {
      updatedCard.sport = match.sport;
    }
    if (match.year) {
      updatedCard.year = match.year;
    }
    if (match.setName) {
      updatedCard.setName = match.setName;
    }
    if (match.manufacture) {
      updatedCard.manufacture = match.manufacture;
    }
    if (match.ItemID) {
      updatedCard.ItemID = match.ItemID;
    }
    if (match.sku) {
      updatedCard.sku = match.sku;
    }
    if (match.bin) {
      updatedCard.bin = match.bin;
    }
  }
  return updatedCard;
}

export async function matchOldStyle(db, card) {
  let updatedCard = { ...card };

  //now try a fairly specific search
  let query = db.collection('OldSales').where('year', '==', updatedCard.year);
  if (updatedCard.sport) {
    query = query.where('sport', '==', titleCase(updatedCard.sport));
  }

  const queryResults = await query.get();
  let possibleCards = [];
  queryResults.forEach((doc) => {
    possibleCards.push(doc.data());
  });

  let match = possibleCards.find(
    (c) =>
      updatedCard.cardNumber === c.cardNumber &&
      updatedCard.setName === c.setName &&
      updatedCard.manufacture === c.manufacture &&
      updatedCard.insert === c.insert &&
      updatedCard.parallel === c.parallel,
  );
  if (match) {
    return mergeFirebaseResult(updatedCard, match);
  }

  //remove non-digits from the number and search again
  match = possibleCards.find(
    (c) =>
      updatedCard.cardNumber.toString().replace(/\D*/, '') === c.cardNumber.toString().replace(/\D*/, '') &&
      updatedCard.setName === c.setName &&
      updatedCard.manufacture === c.manufacture &&
      updatedCard.insert === c.insert &&
      updatedCard.parallel === c.parallel,
  );
  if (match) {
    return mergeFirebaseResult(updatedCard, match);
  }

  //do some weird stuff for 2021 absolute that was entered in a strange way early on
  const searchSet =
    updatedCard.year === '2021' && updatedCard.setName.indexOf('Absolute') > -1 ? 'Absolute' : updatedCard.setName;
  match = possibleCards.find(
    (c) =>
      updatedCard.cardNumber.toString().replace(/\D*/, '') === c.cardNumber.toString().replace(/\D*/, '') &&
      c.Title.toLowerCase().indexOf(searchSet.toLowerCase()) > -1 &&
      (!updatedCard.insert || c.Title.toLowerCase().indexOf(updatedCard.insert.toLowerCase()) > -1) &&
      (!updatedCard.parallel || c.Title.toLowerCase().indexOf(updatedCard.parallel.toLowerCase()) > -1),
  );

  if (match) {
    return mergeFirebaseResult(updatedCard, match);
  }

  //do some chronicles magic
  if (updatedCard.setName === 'Chronicles') {
    match = possibleCards.find(
      (c) =>
        updatedCard.cardNumber === c.cardNumber &&
        c.Title.toLowerCase().indexOf(updatedCard.setName.toLowerCase()) > -1 &&
        (!updatedCard.insert ||
          c.Title.toLowerCase().indexOf(
            updatedCard.insert
              .toLowerCase()
              .replace('update rookies', '')
              .replace('rookie update', '')
              .replace('rookies update', '')
              .trim(),
          ) > -1) &&
        (!updatedCard.parallel || c.Title.toLowerCase().indexOf(updatedCard.parallel.toLowerCase()) > -1),
      !updatedCard.parallel ||
        c.Title.toLowerCase().indexOf(updatedCard.parallel.replace('and', '&').toLowerCase()) > -1,
    );
    if (match) {
      return mergeFirebaseResult(updatedCard, match);
    }
  }

  //try to at least find the group sales info
  const collection = db.collection('SalesGroups');
  if (card.bin) {
    const queryResults = await collection.doc(card.bin).get();
    if (queryResults.exists) {
      return mergeFirebaseResult(updatedCard, queryResults.data());
    }
  }

  //try to do an exact query on skuPrefix
  const skuPrefix = getSkuPrefix(card);
  const skuQuery = collection.where('skuPrefix', '==', skuPrefix);
  console.log('Search for skuPrefix', skuPrefix);
  const skuQueryResults = await skuQuery.get();
  console.log(skuQueryResults.size);
  if (skuQueryResults.size === 1) {
    return mergeFirebaseResult(updatedCard, skuQueryResults.docs[0].data());
  }

  //if we never found a match just return the original card
  if (!match) {
    console.log(chalk.red('Could not find listing in firebase: '), updatedCard.title);
    updatedCard.sport = await ask('What sport is this card?', updatedCard.sport, { selectOptions: sports });
    updatedCard.year = await ask('What year is this card?', updatedCard.year);
    updatedCard.manufacture = await ask('What manufacture is this card?', updatedCard.manufacture);
    updatedCard.setName = await ask('What set is this card?', updatedCard.setName);
    updatedCard.insert = await ask('What insert is this card?', updatedCard.insert);
    updatedCard.parallel = await ask('What parallel is this card?', updatedCard.parallel);
    updatedCard = { ...updatedCard, ...(await getGroup(updatedCard)) };
  }
  return updatedCard;
}

export async function getListingInfo(db, cards) {
  log('Getting listing info from Firebase'); //once oldMatch goes away can use spinner
  // showSpinner('firebase', 'Getting listing info from Firebase');
  const removals = [];
  for (let card of cards) {
    if (card.sku) {
      showSpinner(card.sku, `Getting listing info from Firebase for ${card.title} via sku ${card.sku}`);
      const doc = await db.collection('CardSales').doc(card.sku).get();
      if (doc.exists) {
        removals.push({ ...card, ...doc.data() });
        finishSpinner(card.sku, card.sku);
      } else {
        const match = await matchOldStyle(db, card);
        if (match) {
          removals.push(match);
          finishSpinner(card.sku, card.sku);
        } else {
          errorSpinner(card.sku, card.sku);
        }
      }
    } else {
      const match = await matchOldStyle(db, card);
      if (match) {
        removals.push(match);
      }
    }
  }
  log('Finished getting listing info from Firebase'); //once oldMatch goes away can use spinner
  // finishSpinner('firebase', 'Getting listing info from Firebase');
  return removals;
}

/**
 * Retrieves sales data from a file named offline_sales.csv in the root directory of the project.
 *
 * @returns {Promise<*[]|(*&{quantity: *, platform: string})[]>} Returns an array of sales data objects, each containing card details, quantity, and platform.
 */
export async function getFileSales() {
  showSpinner('getFileSales', 'Getting offline sales');
  let results = [];
  //ADD A CARD

  // return [
  //   {
  //     ...convertTitleToCard(
  //       '2019-20 Upper Deck Artifacts Rookie Redemption Mario Ferraro #RED204 San Jose Sharks #/999',
  //     ),
  //     quantity: 1,
  //     platform: 'TestSale',
  //     sku: 'testing|1',
  //   },
  // ];

  // ADD A FILE
  if (fs.existsSync('offline_sales.csv')) {
    results = fs
      .readFileSync('offline_sales.csv', { encoding: 'utf-8' })
      .split('\n')
      .map((line) => {
        const words = line.split(',');
        return {
          ...convertTitleToCard(words[0]),
          quantity: words[1],
          platform: 'offline_sales',
          sku: words[2],
        };
      })
      .filter((card) => card.cardNumber);
  }
  finishSpinner('getFileSales', `Found ${chalk.green(results.length)} offline sales`);
  return results;
}

let _cachedNumbers;

/**
 * Get the next number in the sequence for the given collection type
 *
 * @param collectionType {string}  The collection type to get the next number for
 * @returns {Promise<number>} The next number in the sequence
 */
export async function getNextCounter(collectionType) {
  const doc = await getFirestore().collection('counters').doc('Sales');
  if (!_cachedNumbers) {
    const result = await doc.get();
    _cachedNumbers = result.data();
  }

  if (!_cachedNumbers[collectionType]) {
    _cachedNumbers[collectionType] = 1;
  }

  _cachedNumbers[collectionType]++;

  await doc.set(_cachedNumbers);

  return ++_cachedNumbers[collectionType];
}

/**
 * Save the current counter values to Firebase
 */
export async function shutdownFirebase() {
  if (_cachedNumbers) {
    await getFirestore().collection('counters').doc('Sales').update(_cachedNumbers);
  }
}

const _cachedGroups = {};

const getSkuPrefix = (setInfo) =>
  `${setInfo.sport}|${setInfo.year}|${setInfo.manufacture}|${setInfo.setName}|${setInfo.insert || ''}|${
    setInfo.parallel || ''
  }`
    .replaceAll(' ', '-')
    .toLowerCase();

/**
 * Retrieves a sales group from the database based on the provided information.
 *
 * @param {Object} info - The information used to identify the sales group.
 * @param {string} info.sport - The sport of the sales group.
 * @param {string} info.year - The year of the sales group.
 * @param {string} info.manufacture - The manufacture of the sales group.
 * @param {string} info.setName - The name of the sales group.
 * @param {string} [info.insert] - The insert of the sales group (optional).
 * @param {string} [info.parallel] - The parallel of the sales group (optional).
 * @param {boolean} [isTemp] - Should only be temp if the group is being created from an old listing that was sold
 * @returns {Promise<{
 *   sport: string,
 *   year: string,
 *   manufacture: string,
 *   setName: string,
 *   insert: string|null,
 *   parallel: string|null,
 *   skuPrefix: string,
 *   bin: number
 * }>} - A promise that resolves to the retrieved sales group or newly saved sales group.
 */
export async function getGroup(info, isTemp) {
  if (isTemp) {
    if (!_cachedGroups[isTemp]) {
      if (info.bin) {
        const db = getFirestore();
        const collection = db.collection('SalesGroups');
        const queryResults = await collection.doc(info.bin).get();
        if (queryResults.exists) {
          _cachedGroups[isTemp] = await queryResults.data();
        }
      } else {
        _cachedGroups[isTemp] = {
          sport: info.sport?.toLowerCase(),
          year: info.year?.toLowerCase(),
          manufacture: info.manufacture?.toLowerCase(),
          setName: info.setName?.toLowerCase(),
          insert: info.insert?.toLowerCase(),
          parallel: info.parallel?.toLowerCase(),
          skuPrefix: isTemp,
          bin: isTemp,
        };
      }
    }
    return _cachedGroups[isTemp];
  } else {
    const db = getFirestore();
    const collection = db.collection('SalesGroups');
    const setInfo = {
      sport: info.sport.toLowerCase(),
      year: info.year.toLowerCase(),
      manufacture: info.manufacture.toLowerCase(),
      setName: info.setName.toLowerCase(),
      insert: info.insert?.toLowerCase() || null,
      parallel: info.parallel?.toLowerCase() || null,
    };
    const query = collection
      .where('keys.sport', '==', setInfo.sport)
      .where('keys.year', '==', setInfo.year)
      .where('keys.manufacture', '==', setInfo.manufacture)
      .where('keys.setName', '==', setInfo.setName)
      .where('keys.insert', '==', setInfo.insert)
      .where('keys.parallel', '==', setInfo.parallel);
    const queryResults = await query.get();

    if (queryResults.size === 0) {
      const group = {
        sport: info.sport,
        year: info.year,
        manufacture: info.manufacture,
        setName: info.setName,
        insert: info.insert,
        parallel: info.parallel,
        league: info.league || findLeague(info.sport) || 'Other',
        skuPrefix: getSkuPrefix(setInfo),
        bin: await getNextCounter('Group'),
        bscPrice: info.bscPrice || 0.25,
        slPrice: info.slPrice || 0.18,
        price: info.price || 0.99,
        keys: setInfo,
      };
      await collection.doc(`${group.bin}`).set(group);
      _cachedGroups[group.bin] = group;
      return group;
    } else if (queryResults.size === 1) {
      _cachedGroups[queryResults.docs[0].id] = queryResults.docs[0].data();
      return queryResults.docs[0].data();
    } else {
      const choices = [];
      queryResults.forEach((doc) => {
        const g = doc.data();
        choices.push({
          name: `${g.year} ${g.setName} ${g.insert} ${g.parallel}`,
          value: g,
          description: `${g.year} ${g.manufacture} ${g.setName} ${g.insert} ${g.parallel} ${g.sport}`,
        });
      });
      console.log('Trying to find:', setInfo);
      const response = await ask('Which group is correct?', undefined, { selectOptions: choices });
      _cachedGroups[response.bin] = response;
      return response;
    }
  }
}

export async function getGroupByBin(bin) {
  if (_cachedGroups[bin]) {
    return _cachedGroups[bin];
  } else {
    const db = getFirestore();
    const group = await db.collection('SalesGroups').doc(bin).get();
    _cachedGroups[bin] = group.data();
    return group.data();
  }
}
export async function updateGroup(group) {
  _cachedGroups[group.bin] = group;
  const db = getFirestore();
  // console.log('updating group', group);
  await db.collection('SalesGroups').doc(`${group.bin}`).set(group);
}
