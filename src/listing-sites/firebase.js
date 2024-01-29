import { getFirestore, getStorage } from '../utils/firebase.js';
import { ask } from '../utils/ask.js';
import { findLeague } from '../utils/teams.js';
import { titleCase } from '../utils/data.js';
import { useSpinners } from '../utils/spinners.js';
import getSetData from '../card-data/setData.js';
import { convertTitleToCard } from './uploads.js';

const { showSpinner, finishSpinner, updateSpinner, errorSpinner } = useSpinners('firebase', '#ffc107');

export async function uploadToFirebase(allCards) {
  showSpinner('upload', 'Firebase Starting Upload');
  const db = getFirestore();
  const collection = db.collection('CardSales');
  let count = 0;
  for (const card of Object.values(allCards)) {
    showSpinner(card.sku, `Uploading ${card.title}`);
    try {
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
      finishSpinner(card.sku, `Uploaded ${card.title}`);
    } catch (e) {
      errorSpinner(card.sku, `Failed to upload ${card.title}: ${e.message}`);
    }
  }
  if (count === allCards.length) {
    finishSpinner('upload', `Successfully added ${count} cards to Firebase`);
  } else {
    errorSpinner('upload', `Only added ${count} of ${allCards.length} cards to Firebase`);
  }
}

export async function updateFirebaseListing(card) {
  showSpinner(card.sku, `Updating ${card.sku}`);
  const db = getFirestore();
  const collection = db.collection('CardSales');
  try {
    await collection.doc(card.sku).update(card);
    finishSpinner(card.sku);
  } catch (e) {
    errorSpinner(card.sku, `Failed to update ${card.title}: ${e.message}`);
  }
}

export async function mergeFirebaseResult(card, match) {
  showSpinner('merge', `Merging card data with firebase data`);
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
    if (match.cardNumber) {
      updatedCard.cardNumber = match.cardNumber;
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
    if (match.myslabs) {
      updatedCard.myslabs = match.myslabs;
    }
  }
  if (
    (!updatedCard.bin || !updatedCard.sku) &&
    (!updatedCard.sport || !updatedCard.year || !updatedCard.manufacture || !updatedCard.setName)
  ) {
    errorSpinner('merge', `Missing some required data. Please confirm for card: ${updatedCard.title}`);
    updatedCard = { ...updatedCard, ...(await getSetData(updatedCard, false)) };
  } else {
    finishSpinner('merge');
  }
  return updatedCard;
}

export async function matchOldStyle(db, card) {
  const { update, finish, error } = showSpinner(
    `old-${card.title}`,
    `Getting listing info from Firebase for ${card.title} via old style`,
  );
  let updatedCard = {
    ...card,
    manufacture: card.setName === 'Score' ? 'Score' : card.manufacture,
  };
  try {
    //now try a fairly specific search
    update(`Set up collection query`);
    let query = db.collection('OldSales').where('year', '==', updatedCard.year);
    if (updatedCard.sport) {
      query = query.where('sport', '==', titleCase(updatedCard.sport));
    }

    const queryResults = await query.get();
    let possibleCards = [];
    queryResults.forEach((doc) => {
      possibleCards.push(doc.data());
    });

    update(`match on everything`);
    let match = possibleCards.find(
      (c) =>
        updatedCard.cardNumber === c.cardNumber &&
        updatedCard.setName === c.setName &&
        updatedCard.manufacture === c.manufacture &&
        updatedCard.insert === c.insert &&
        updatedCard.parallel === c.parallel,
    );
    if (match) {
      finish(`Found exact listing for ${card.title}`);
      return mergeFirebaseResult(updatedCard, match);
    }

    update(`card numbers with letters removed`);
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
      finish(`Found fuzzy number listing in firebase for ${card.title}`);
      return mergeFirebaseResult(updatedCard, match);
    }

    update(`lower case set name`);
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
      finish(`Found lower case set name listing in firebase for ${card.title}`);
      return mergeFirebaseResult(updatedCard, match);
    }

    update(`Chronicles`);
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
        finish(`Found Chronicles listing in firebase for ${card.title}`);
        return mergeFirebaseResult(updatedCard, match);
      }
    }

    update(`matching sales group even if we don't have the card`);
    const collection = db.collection('SalesGroups');
    if (card.bin) {
      const queryResults = await collection.doc(card.bin).get();
      if (queryResults.exists) {
        finish(`Found sales group by bin in firebase for ${card.title}`);
        return mergeFirebaseResult(updatedCard, queryResults.data());
      }
    }

    update(`exact skuPrefix match`);
    const skuPrefix = getSkuPrefix(card);
    const skuQuery = collection.where('skuPrefix', '==', skuPrefix);
    const skuQueryResults = await skuQuery.get();
    if (skuQueryResults.size === 1) {
      finish(`Found sales group by skuPrefix in firebase for ${card.title}`);
      return mergeFirebaseResult(updatedCard, skuQueryResults.docs[0].data());
    }

    if (
      !match ||
      !updatedCard.sport ||
      !updatedCard.year ||
      !updatedCard.manufacture ||
      !updatedCard.setName ||
      !updatedCard.bin ||
      !updatedCard.sportlots ||
      !updatedCard.bscFiltersx
    ) {
      error(`Could not find listing in firebase for ${card.title}`);
      updatedCard = { ...updatedCard, ...(await getSetData(updatedCard, false)) };
    } else {
      finish(`Found listing in firebase for ${card.title}`);
    }
  } catch (e) {
    error(e);
    throw e;
  }

  return updatedCard;
}

export async function getListingInfo(cards) {
  showSpinner('getListingInfo', 'Getting listing info from Firebase');
  const db = getFirestore();
  const removals = [];
  for (let card of cards) {
    if (card.sku) {
      showSpinner(card.sku, `Getting listing info from Firebase for ${card.title} via sku ${card.sku}`);
      const doc = await db.collection('CardSales').doc(card.sku).get();
      if (doc.data() && doc.data().sku) {
        updateSpinner(card.sku, `Setting ${card.sku} to sold`);
        await updateFirebaseListing({ sku: card.sku, sold: true });
        removals.push(await mergeFirebaseResult(card, doc.data()));
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
  finishSpinner('getListingInfo', 'Getting listing info from Firebase');
  return removals;
}

export async function getCardBySKU(sku) {
  showSpinner('getCardBySKU', `Getting card by sku ${sku}`);
  const db = getFirestore();
  const doc = await db.collection('CardSales').doc(sku).get();
  if (doc.data()) {
    finishSpinner('getCardBySKU');
    return doc.data();
  } else {
    errorSpinner('getCardBySKU', `Failed to find card by sku ${sku} | ${e.message}`);
    return null;
  }
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
        if (line.indexOf(',') === -1) {
          return {
            quantity: 1,
            platform: 'offline_sales',
            sku: line,
          };
        } else {
          const words = line.split(',');
          return {
            ...convertTitleToCard(words[0]),
            quantity: words[1],
            platform: 'offline_sales',
            sku: words[2],
          };
        }
      })
      .filter((card) => card.cardNumber || card.sku);
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
  showSpinner('getNextCounter', `Getting next counter for ${collectionType}`);
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

  const next = ++_cachedNumbers[collectionType];
  finishSpinner('getNextCounter');
  return next;
}

/**
 * Save the current counter values to Firebase
 */
export async function shutdownFirebase() {
  showSpinner('shutdown', 'Shutting down Firebase');
  if (_cachedNumbers) {
    await getFirestore().collection('counters').doc('Sales').update(_cachedNumbers);
  }
  finishSpinner('shutdown', 'Firebase shutdown complete');
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
 * @param {string} [info.league] - The league of the sales group (optional).
 * @param {number} [info.bin] - The bin of the sales group (optional).
 * @param {number} [info.bscPrice] - The bscPrice of the sales group (optional).
 * @param {number} [info.slPrice] - The slPrice of the sales group (optional).
 * @param {number} [info.price] - The price of the sales group (optional).
 * @param {string} [info.skuPrefix] - The skuPrefix of the sales group (optional).
 *
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
export async function getGroup(info) {
  showSpinner('getGroup', `Getting group for ${info.bin || info.skuPrefix}`);
  showSpinner('getGroup-details', `Getting group for ${info.bin || info.skuPrefix}`);

  if (info.bin) {
    updateSpinner('getGroup-details', `Getting group by bin ${info.bin}`);
    const group = await getGroupByBin(info.bin);
    if (group) {
      finishSpinner('getGroup-details');
      finishSpinner('getGroup');
      return group;
    }
  }

  updateSpinner('getGroup-details', `Querying Firebase for group`);
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
    updateSpinner('getGroup-details', `No group found, creating new group`);
    const group = {
      sport: info.sport,
      year: info.year,
      manufacture: info.manufacture,
      setName: info.setName,
      insert: info.insert || null,
      parallel: info.parallel || null,
      league: info.league || findLeague(info.sport) || 'Other',
      skuPrefix: getSkuPrefix(setInfo),
      bin: await getNextCounter('Group'),
      bscPrice: info.bscPrice || 0.25,
      slPrice: info.slPrice || 0.18,
      price: info.price || 0.99,
      keys: setInfo,
      sportlots: info.sportlots || null,
      bscFilters: info.bscFilters || null,
    };
    await collection.doc(`${group.bin}`).set(group);
    _cachedGroups[group.bin] = group;
    finishSpinner('getGroup-details');
    finishSpinner('getGroup');
    return group;
  } else if (queryResults.size === 1) {
    finishSpinner('getGroup-details');
    finishSpinner('getGroup');
    _cachedGroups[queryResults.docs[0].id] = queryResults.docs[0].data();
    return queryResults.docs[0].data();
  } else {
    errorSpinner(
      'getGroup-details',
      `Found multiple groups for ${info.sport} ${info.year} ${info.setName} insert:${info.insert} parallel:${info.parallel}`,
    );
    const choices = [];
    queryResults.forEach((doc) => {
      const g = doc.data();
      choices.push({
        name: `${g.year} ${g.setName} ${g.insert} ${g.parallel}`,
        value: g,
        description: `${g.year} ${g.manufacture} ${g.setName} ${g.insert} ${g.parallel} ${g.sport}`,
      });
    });
    const response = await ask('Which group is correct?', undefined, { selectOptions: choices });
    _cachedGroups[response.bin] = response;
    finishSpinner('getGroup');
    return response;
  }
}

export async function getGroupByBin(bin) {
  showSpinner('getGroupByBin', `Getting group by bin ${bin}`);
  if (_cachedGroups[bin]) {
    finishSpinner('getGroupByBin');
    return _cachedGroups[bin];
  } else {
    const db = getFirestore();
    updateSpinner('getGroupByBin', `Getting group by bin ${bin} - Fetching from Firebase`);
    let group;
    try {
      group = await db.collection('SalesGroups').doc(`${bin}`).get();
    } catch (e) {
      console.log('getGroupByBin', `Failed to get group by bin ${bin}: ${e.message}`);
      throw e;
    }
    _cachedGroups[bin] = group.data();
    finishSpinner('getGroupByBin');
    return group.data();
  }
}

export async function updateGroup(group) {
  showSpinner('updateGroup', `Updating group ${group.bin}`);
  const doc = getFirestore().collection('SalesGroups').doc(`${group.bin}`);
  await doc.update(group);
  const updatedDoc = await doc.get();
  _cachedGroups[group.bin] = updatedDoc.data();
  finishSpinner('updateGroup');
  return _cachedGroups[group.bin];
}

// upload file to firebase storage
export const processImageFile = async (outputFile, filename) => {
  showSpinner(`upload-${filename}`, `Uploading ${filename}`);
  try {
    const r = await getStorage().bucket().upload(outputFile, { destination: filename });
    finishSpinner(`upload-${filename}`, `Uploaded ${filename} to Firebase ${JSON.stringify(r)}`);
  } catch (e) {
    errorSpinner(`upload-${filename}`, `Failed to upload ${filename} to Firebase: ${e.message}`);
    throw e;
  }
};
