import { getFirestore } from '../utils/firebase.js';
import chalk from 'chalk';
import { reverseTitle } from './ebay.js';
import { convertTitleToCard } from './sportlots.js';
import { ask } from '../utils/ask.js';
import { findTeamInString } from '../utils/teams.js';
import { titleCase } from '../utils/data.js';

export async function uploadToFirebase(allCards) {
  console.log(chalk.magenta('Firebase Starting Upload'));
  const db = getFirestore();
  const collection = db.collection('CardSales');
  let count = 0;
  for (const card of allCards) {
    await collection.doc('').set({
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

export async function getListingInfo(db, cards) {
  const removals = [];
  const addRemoval = (card, match) => {
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
    }
    removals.push(updatedCard);
  };
  for (let card of cards) {
    // console.log('card', card);
    const updatedCard = {
      ...card,
      sport: findTeamInString(card.title) || card.sport,
    };
    // console.log('card', updatedCard);
    let query = db.collection('OldSales').where('year', '==', updatedCard.year);
    if (updatedCard.sport) {
      query = query.where('sport', '==', titleCase(updatedCard.sport));
    }
    // if (updatedCard.cardNumber === 175) {
    // console.log('card', updatedCard);
    // }

    const queryResults = await query.get();
    let possibleCards = [];
    queryResults.forEach((doc) => {
      possibleCards.push(doc.data());
    });
    // console.log('found possible cards', possibleCards.length);

    let match = possibleCards.find(
      (c) =>
        updatedCard.cardNumber === c.cardNumber &&
        updatedCard.setName === c.setName &&
        updatedCard.manufacture === c.manufacture &&
        updatedCard.insert === c.insert &&
        updatedCard.parallel === c.parallel,
    );
    if (match) {
      addRemoval(updatedCard, match);
    } else {
      match = possibleCards.find(
        (c) =>
          updatedCard.cardNumber.toString().replace(/\D*/, '') === c.cardNumber.toString().replace(/\D*/, '') &&
          updatedCard.setName === c.setName &&
          updatedCard.manufacture === c.manufacture &&
          updatedCard.insert === c.insert &&
          updatedCard.parallel === c.parallel,
      );
      if (match) {
        addRemoval(updatedCard, match);
      } else {
        const searchSet =
          updatedCard.year === '2021' && updatedCard.setName.indexOf('Absolute') > -1
            ? 'Absolute'
            : updatedCard.setName;
        match = possibleCards.find(
          (c) =>
            updatedCard.cardNumber.toString().replace(/\D*/, '') === c.cardNumber.toString().replace(/\D*/, '') &&
            c.Title.toLowerCase().indexOf(searchSet.toLowerCase()) > -1 &&
            (!updatedCard.insert || c.Title.toLowerCase().indexOf(updatedCard.insert.toLowerCase()) > -1) &&
            (!updatedCard.parallel || c.Title.toLowerCase().indexOf(updatedCard.parallel.toLowerCase()) > -1),
        );

        if (match) {
          addRemoval(updatedCard, match);
        } else if (updatedCard.setName === 'Chronicles') {
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
            addRemoval(updatedCard, match);
          } else {
            console.log(chalk.red('Could not find listing in firebase: '), updatedCard);
            removals.push(updatedCard);
          }
        } else {
          console.log(chalk.red('Could not find listing in firebase: '), updatedCard);
          removals.push(updatedCard);
        }
      }
    }
  }
  return removals;
}

/**
 * Retrieves sales data from a file named offline_sales.csv in the root directory of the project.
 *
 * @returns {Promise<*[]|(*&{quantity: *, platform: string})[]>} Returns an array of sales data objects, each containing card details, quantity, and platform.
 */
export async function getFileSales() {
  //ADD A CARD

  // return [
  //   {
  //     ...convertTitleToCard('2020 Panini Chronicles Luminance Update Rookies #206 Ceedee Lamb FB'),
  //     quantity: 1,
  //     platform: 'BigSale',
  //   },
  // ];

  // ADD A FILE
  if (fs.existsSync('offline_sales.csv')) {
    return fs
      .readFileSync('offline_sales.csv', { encoding: 'utf-8' })
      .split('\n')
      .map((line) => {
        const words = line.split(',');
        return {
          ...convertTitleToCard(words[0]),
          quantity: words[1],
          platform: 'offline_sales',
        };
      })
      .filter((card) => card.cardNumber);
  } else {
    return [];
  }
}

let _cachedNumbers;

/**
 * Get the next number in the sequence for the given collection type
 *
 * @param collectionType {string}  The collection type to get the next number for
 * @returns {Promise<number>} The next number in the sequence
 */
export async function getNextCounter(collectionType) {
  if (!_cachedNumbers) {
    const doc = await getFirestore().collection('counters').doc('Sales').get();
    _cachedNumbers = doc.data();
  }

  if (!_cachedNumbers[collectionType]) {
    _cachedNumbers[collectionType] = 1;
  }

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
  const db = getFirestore();
  const collection = db.collection('SalesGroups');
  const setInfo = {
    sport: info.sport.toLowerCase(),
    year: info.year.toLowerCase(),
    manufacture: info.manufacture.toLowerCase(),
    setName: info.setName.toLowerCase(),
    insert: info.insert?.toLowerCase(),
    parallel: info.parallel?.toLowerCase(),
  };
  const query = collection
    .where('sport', '==', setInfo.sport)
    .where('year', '==', setInfo.year)
    .where('manufacture', '==', setInfo.manufacture)
    .where('setName', '==', setInfo.setName)
    .where('insert', '==', setInfo.insert || null)
    .where('parallel', '==', setInfo.parallel || null);
  const queryResults = await query.get();

  if (queryResults.size === 0) {
    const group = {
      sport: setInfo.sport,
      year: setInfo.year,
      manufacture: setInfo.manufacture,
      setName: setInfo.setName,
      insert: setInfo.insert || null,
      parallel: setInfo.parallel || null,
      skuPrefix: `${setInfo.sport}|${setInfo.year}|${setInfo.manufacture}|${setInfo.setName}|${setInfo.insert || ''}|${
        setInfo.parallel || ''
      }`.replaceAll(' ', '-'),
      bin: await getNextCounter('Group'),
    };
    await collection.doc(`${group.bin}`).set(group);
    return group;
  } else if (queryResults.size === 1) {
    return queryResults.docs[0].data();
  } else {
    const choices = [];
    queryResults.forEach((doc) => {
      const g = doc.data();
      choices.push({
        name: `${g.year} ${g.setName} ${g.insert} ${g.parallel}`,
        value: g,
        description: `${g.year} ${g.year} ${g.manufacture} ${g.setName} ${g.insert} ${g.parallel} ${g.sport}`,
      });
    });
    console.log('Trying to find:', setInfo);
    return await ask('Which group is correct?', undefined, { selectOptions: choices });
  }
}
