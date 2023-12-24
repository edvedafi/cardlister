import { getEbaySales, removeFromEbay } from './listing-sites/ebay.js';
import dotenv from 'dotenv';
import 'zx/globals';
import { createGroups } from './listing-sites/uploads.js';
import chalk, { foregroundColorNames } from 'chalk';
import { removeFromShopify } from './listing-sites/shopifyUpload.js';
import { getSalesSportLots, removeFromSportLots, shutdownSportLots } from './listing-sites/sportlots.js';
import { removeFromMyCardPost, shutdownMyCardPost } from './listing-sites/mycardpost.js';
import { getBuySportsCardsSales, removeFromBuySportsCards, shutdownBuySportsCards } from './listing-sites/bsc.js';
import chalkTable from 'chalk-table';
import {
  getFileSales,
  getGroup,
  getListingInfo,
  getNextCounter,
  shutdownFirebase,
  updateSport,
  uploadOldListings,
} from './listing-sites/firebase.js';
import { getFirestore } from 'firebase-admin/firestore';
import initializeFirebase from './utils/firebase.js';
import { getTeamSelections, loadTeams } from './utils/teams.js';
import minimist from 'minimist';
import { ask } from './utils/ask.js';
import open from 'open';

const args = minimist(process.argv.slice(2));

$.verbose = false;

dotenv.config();

let isShuttingDown = false;
const shutdown = async () => {
  if (!isShuttingDown) {
    isShuttingDown = true;
    await Promise.all([shutdownSportLots(), shutdownBuySportsCards(), shutdownFirebase(), shutdownMyCardPost()]);
  }
};

['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) => {
  process.on(signal, () => {
    shutdown().then(() => {
      process.exit();
    });
  });
});

function buildTableData(groupedCards) {
  const divider = {
    sport: '--------',
    year: '----',
    setName: '---',
    parallel: '--------',
    insert: '------',
    cardNumber: '-----',
    quantity: '-----',
    title: '-----',
    platform: '--------',
  };
  Object.values(groupedCards).forEach((cards) =>
    cards.forEach((card) =>
      Object.keys(divider).forEach((key) => {
        divider[key] = '-'.repeat(Math.max(parseInt(card[key]?.length || 0), parseInt(divider[key]?.length || 0)));
      }),
    ),
  );

  const displayCards = [];
  let color = chalk.magenta;
  const orderColors = {};
  const orderColor = (orderId) => {
    if (!orderColors[orderId]) {
      orderColors[orderId] = [
        chalk.red,
        chalk.green,
        chalk.yellow,
        chalk.blue,
        // chalk.magenta,
        chalk.cyan,
        chalk.white,
        chalk.redBright,
        chalk.greenBright,
        chalk.yellowBright,
        // chalk.blueBright,
        chalk.magentaBright,
        chalk.cyanBright,
        chalk.whiteBright,
        chalk.bgRed,
        chalk.bgGreen,
        chalk.bgYellow,
        chalk.bgBlue,
        chalk.bgMagenta,
        chalk.bgCyan,
        chalk.bgWhite,
        chalk.bgBlackBright,
        chalk.bgRedBright,
        chalk.bgGreenBright,
        chalk.bgYellowBright,
        chalk.bgBlueBright,
        chalk.bgMagentaBright,
        chalk.bgCyanBright,
        chalk.bgWhiteBright,
      ][Object.keys(orderColors).length];
    }
    // console.log(`order ${orderId} is color ${orderColors[orderId]}`);
    return orderColors[orderId];
  };
  Object.keys(groupedCards)
    .sort((k1, k2) => {
      const [sport1, year1, manufacture1, setName1, insert1, parallel1] = k1.split('|');
      const [sport2, year2, manufacture2, setName2, insert2, parallel2] = k2.split('|');
      if (sport1 !== sport2) {
        return sport1 < sport2 ? -1 : 1;
      } else if (year1 !== year2) {
        return year1 < year2 ? -1 : 1;
      } else if (manufacture1 !== manufacture2) {
        return manufacture1 < manufacture2 ? -1 : 1;
      } else if (setName1 !== setName2) {
        return setName1 < setName2 ? -1 : 1;
      } else if (insert1 !== insert2) {
        return insert1 < insert2 ? -1 : 1;
      } else if (parallel1 !== parallel2) {
        return parallel1 < parallel2 ? -1 : 1;
      } else {
        return 0;
      }
    })
    .forEach((key, i) => {
      if (i > 0) displayCards.push(divider);
      displayCards.push(
        ...groupedCards[key]
          .sort((c1, c2) => {
            const cardNumber1 = Number.parseInt(c1.cardNumber);
            const cardNumber2 = Number.parseInt(c2.cardNumber);
            if (cardNumber1 && cardNumber2) {
              return cardNumber1 - cardNumber2;
            } else if (cardNumber1) {
              return -1;
            } else if (cardNumber2) {
              return 1;
            } else {
              return 0;
            }
          })
          .map((card) => {
            Object.keys(card).forEach(
              (key) => (card[key] = key === 'platform' ? orderColor(card.platform)(card.platform) : color(card[key])),
            );
            return card;
          }),
      );
      color = color === chalk.magenta ? chalk.blueBright : chalk.magenta;
    });
  return displayCards;
}

try {
  const firebase = initializeFirebase();
  const db = getFirestore(firebase);
  await loadTeams(firebase);

  //gather sales
  console.log(chalk.cyan('Gather listings from sites'));
  const results = await Promise.all([getFileSales(), getEbaySales(), getBuySportsCardsSales(), getSalesSportLots()]);
  const rawSales = results.reduce((s, result) => s.concat(result), []);
  console.log(chalk.cyan('Found'), chalk.green(rawSales.length), chalk.cyan('cards sold'));
  // console.log('rawSales', rawSales);

  //prep listings to remove
  console.log(chalk.cyan('Updating sales with listing info'));
  const openSalesSites = [];

  const sales = await getListingInfo(db, rawSales);
  const groupedCards = await createGroups({}, sales);

  if (sales.find((sale) => sale.platform.indexOf('SportLots: ') > -1)) {
    openSalesSites.push('https://sportlots.com/inven/dealbin/dealacct.tpl?ordertype=1a');
  }
  if (sales.find((sale) => sale.platform.indexOf('BSC: ') > -1)) {
    openSalesSites.push('https://www.buysportscards.com/sellers/orders');
  }
  if (sales.find((sale) => sale.platform.indexOf('MCP: ') > -1)) {
    openSalesSites.push('https://mycardpost.com/edvedafi/offers');
  }
  if (sales.find((sale) => sale.platform.indexOf('ebay: ') > -1)) {
    openSalesSites.push('https://www.ebay.com/sh/ord?filter=status:AWAITING_SHIPMENT');
  }
  console.log(chalk.cyan('Completed adding listing info to cards'));

  //remove listings from sites
  console.log(chalk.cyan('Remove listings from sites'));

  if (!args.r || (await ask('Remove from Ebay?', true))) {
    await removeFromEbay(sales, db);
  }
  if (!args.r || (await ask('Remove from Sportlots?', true))) {
    await removeFromSportLots(groupedCards);
  }
  if (!args.r || (await ask('Remove from Buy Sports Cards?', true))) {
    await removeFromBuySportsCards(groupedCards);
  }
  if (!args.r || (await ask('Remove from Shopify?', true))) {
    await removeFromShopify(sales);
  }
  if (!args.r || (await ask('Remove from My Card Post?', true))) {
    await removeFromMyCardPost(sales);
  }
  console.log(chalk.cyan('Completed removing listings from sites'));

  //output a pick list
  console.log(chalk.cyan('All Sales:'));

  console.log(
    chalkTable(
      {
        leftPad: 2,
        columns: [
          { field: 'sport', name: chalk.cyan('Sport') },
          { field: 'year', name: 'Year' },
          { field: 'setName', name: 'Set' },
          { field: 'parallel', name: chalk.green('Parallel') },
          { field: 'insert', name: chalk.blue('Insert') },
          { field: 'cardNumber', name: 'Card #' },
          { field: 'quantity', name: 'Count' },
          { field: 'title', name: 'Title' },
          { field: 'platform', name: 'Sold On' },
        ],
      },
      buildTableData(groupedCards),
    ),
  );

  for (const site of openSalesSites) {
    await open(site);
  }
} finally {
  await shutdown();
}
