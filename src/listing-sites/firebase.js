import initializeFirebase from '../utils/firebase.js';
import { doc, setDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import chalk from 'chalk';
import csv from 'csv-parser';
import { reverseTitle } from './ebay.js';
import { convertTitleToCard } from './sportlots.js';
import { ask } from '../utils/ask.js';

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
    // const docRef = doc(db, 'OldSales', card['Item number']);
    // await setDoc(docRef, {
    //   ItemID: card['Item number'],
    //   quantity: card.quantity,
    //   title: card.Title,
    //   ...reverseTitle(card.Title),
    // });
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
  return fs
    .readFileSync('bigsale.csv', { encoding: 'utf-8' })
    .split('\n')
    .map((line) => {
      const words = line.split(',');
      return {
        ...convertTitleToCard(words[0]),
        quantity: words[1],
        platform: 'BigSale',
      };
    })
    .filter((card) => card.cardNumber);
}
