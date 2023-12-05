import initializeFirebase from '../utils/firebase.js';
import { doc, setDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import chalk from 'chalk';
import { reverseTitle } from './ebay.js';
import { convertTitleToCard } from './sportlots.js';
import { ask } from '../utils/ask.js';
import { findTeamInString } from '../utils/teams.js';
import { titleCase } from '../utils/data.js';

export async function uploadToFirebase(allCards) {
  console.log(chalk.magenta('Firebase Starting Upload'));
  const firebase = initializeFirebase();
  const db = getFirestore(firebase);
  let count = 0;
  for (const card of allCards) {
    const docRef = doc(db, 'CardSales', card.key);
    await setDoc(docRef, {
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
  const firebase = initializeFirebase();
  const db = getFirestore(firebase);
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
      removals.push({
        ...updatedCard,
        ...match,
      });
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
        removals.push({
          ...updatedCard,
          ...match,
        });
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
          removals.push({
            ...updatedCard,
            ...match,
          });
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
            removals.push({
              ...updatedCard,
              ...match,
            });
          } else {
            console.log(chalk.red('Could not find listing in firebase: '), updatedCard.title);
            removals.push(updatedCard);
          }
        } else {
          console.log(chalk.red('Could not find listing in firebase: '), updatedCard.title);
          removals.push(updatedCard);
        }
      }
    }
  }
  return removals;
}

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
