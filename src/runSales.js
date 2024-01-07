import { getEbaySales, removeFromEbay } from './listing-sites/ebay.js';
import dotenv from 'dotenv';
import 'zx/globals';
import { createGroups } from './listing-sites/uploads.js';
import chalk from 'chalk';
import { removeFromShopify } from './listing-sites/shopifyUpload.js';
import { getSalesSportLots, removeFromSportLots, shutdownSportLots } from './listing-sites/sportlots.js';
import { removeFromMyCardPost, shutdownMyCardPost } from './listing-sites/mycardpost.js';
import { getBuySportsCardsSales, removeFromBuySportsCards, shutdownBuySportsCards } from './listing-sites/bsc.js';
import chalkTable from 'chalk-table';
import { getFileSales, getGroupByBin, getListingInfo, shutdownFirebase } from './listing-sites/firebase.js';
import { getFirestore } from 'firebase-admin/firestore';
import initializeFirebase from './utils/firebase.js';
import { loadTeams } from './utils/teams.js';
import minimist from 'minimist';
import { ask } from './utils/ask.js';
import open from 'open';
import { useSpinners } from './utils/spinners.js';

const args = minimist(process.argv.slice(2));

const log = (...params) => console.log(chalk.cyan(...params));
const { showSpinner, finishSpinner, errorSpinner, updateSpinner, pauseSpinners, resumeSpinners } = useSpinners(
  'sales',
  chalk.cyan,
);

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

async function buildTableData(groupedCards) {
  showSpinner('buildTableData', 'Building table data');
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
    return orderColors[orderId];
  };
  log(Object.keys(groupedCards));
  (await Promise.all(Object.keys(groupedCards).map((bin) => getGroupByBin(bin))))
    .sort((group1, group2) => {
      if (group2.sport.toLowerCase() !== group1.sport.toLowerCase()) {
        return group2.sport.toLowerCase() < group1.sport.toLowerCase() ? -1 : 1;
      } else if (group2.year !== group1.year) {
        return group2.year < group1.year ? -1 : 1;
      } else if (group2.manufacture !== group1.manufacture) {
        return group2.manufacture < group1.manufacture ? -1 : 1;
      } else if (group2.setName !== group1.setName) {
        return group2.setName < group1.setName ? -1 : 1;
      } else if (group2.insert !== group1.insert) {
        return group2.insert < group1.insert ? -1 : 1;
      } else if (group2.parallel !== group1.parallel) {
        return group2.parallel < group1.parallel ? -1 : 1;
      } else {
        return 0;
      }
    })
    .forEach(({ bin }, i) => {
      if (i > 0) displayCards.push(divider);
      displayCards.push(
        ...groupedCards[bin]
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
  finishSpinner('buildTableData');
  return displayCards;
}

try {
  const firebase = initializeFirebase();
  const db = getFirestore(firebase);
  await loadTeams(firebase);

  //gather sales
  showSpinner('top-level', 'Running sales processing');
  showSpinner('gathering', 'Gathering sales from sites');
  const results = await Promise.all([getFileSales(), getEbaySales(), getBuySportsCardsSales(), getSalesSportLots()]);
  const rawSales = results.reduce((s, result) => s.concat(result), []);
  finishSpinner('gathering', `Found ${chalk.green(rawSales.length)} total sales`);

  //prep listings to remove
  showSpinner('sales-info', 'Updating sales with listing info');
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
  finishSpinner('sales-info', 'Completed adding listing info to cards');

  //remove listings from sites
  showSpinner('remove-all', 'Remove listings from sites');
  const removeListings = async (site, remove) => {
    let paused;
    let proceed = true;
    if (args.r) {
      paused = pauseSpinners();
      proceed = await ask(`Remove from ${site}?`, true);
      resumeSpinners(paused);
    }
    if (proceed) {
      await remove();
    }
  };
  await removeListings('Ebay', () => removeFromEbay(sales, db));
  await removeListings('Sportlots', () => removeFromSportLots(groupedCards));
  await removeListings('Buy Sports Cards', () => removeFromBuySportsCards(groupedCards));
  await removeListings('Shopify', () => removeFromShopify(sales));
  await removeListings('My Card Post', () => removeFromMyCardPost(sales));
  finishSpinner('remove-all', 'Completed removing listings from sites');

  showSpinner('launching', 'Launching all sales sites');
  for (const site of openSalesSites) {
    await open(site);
  }
  finishSpinner('launching', 'Launching all sales sites');

  //output a pick list
  log('All Sales:');
  console.log(
    chalkTable(
      {
        leftPad: 2,
        columns: [
          { field: 'sport', name: 'Sport' },
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
      await buildTableData(groupedCards),
    ),
  );
  finishSpinner('top-level', 'Completed sales processing');
} finally {
  await shutdown();
}
