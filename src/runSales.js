import { getEbaySales, removeFromEbay } from './listing-sites/ebay.js';
import dotenv from 'dotenv';
import 'zx/globals';
import { buildTableData, createGroups } from './listing-sites/uploads.js';
import chalk from 'chalk';
import { removeFromShopify } from './listing-sites/shopifyUpload.js';
import {
  getSalesSportLots,
  login as sportlotsLogin,
  removeFromSportLots,
  shutdownSportLots,
} from './listing-sites/sportlots.js';
import {
  getSalesFromMyCardPost,
  login as mcpLogin,
  removeFromMyCardPost,
  shutdownMyCardPost,
} from './listing-sites/mycardpost.js';
import {
  getBuySportsCardsSales,
  login as bscLogin,
  removeFromBuySportsCards,
  shutdownBuySportsCards,
} from './listing-sites/bsc.js';
import chalkTable from 'chalk-table';
import { getFileSales, getListingInfo, shutdownFirebase } from './listing-sites/firebase.js';
import { loadTeams } from './utils/teams.js';
import minimist from 'minimist';
import open from 'open';
import { pauseSpinners, useSpinners } from './utils/spinners.js';
import { getMySlabSales, removeFromMySlabs } from './listing-sites/myslabs.js';
import { ask } from './utils/ask.js';
import initializeFirebase from './utils/firebase.js';

const args = minimist(process.argv.slice(2));

const log = (...params) => console.log(chalk.cyan(...params));
const { showSpinner, finishSpinner, errorSpinner } = useSpinners('sales', chalk.cyan);

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

try {
  initializeFirebase();
  await Promise.all([loadTeams(), sportlotsLogin(), bscLogin(), mcpLogin()]);

  //gather sales
  showSpinner('top-level', 'Running sales processing');
  showSpinner('gathering', 'Gathering sales from sites');
  const results = await Promise.all([
    getMySlabSales(),
    getFileSales(),
    getEbaySales(),
    getBuySportsCardsSales(),
    getSalesSportLots(),
    getSalesFromMyCardPost(),
  ]);
  const rawSales = results.reduce((s, result) => s.concat(result), []);
  finishSpinner('gathering', `Found ${chalk.green(rawSales.length)} total sales`);

  //prep listings to remove
  showSpinner('sales-info', 'Updating sales with listing info');
  const openSalesSites = [];

  const sales = await getListingInfo(rawSales);
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
  if (sales.find((sale) => sale.platform.indexOf('ebay: ') > -1)) {
    openSalesSites.push('https://www.ebay.com/sh/ord?filter=status:AWAITING_SHIPMENT');
  }
  if (sales.find((sale) => sale.platform.indexOf('MySlabs') > -1)) {
    openSalesSites.push('https://www.myslabs.com/account/history/sold/');
  }
  finishSpinner('sales-info', 'Completed adding listing info to cards');

  //remove listings from sites
  showSpinner('remove-all', 'Remove listings from sites');
  const removeListings = async (site, remove) => {
    let proceed = true;
    if (args.r) {
      proceed = await ask(`Remove from ${site}?`, true);
    }
    if (proceed) {
      await remove();
    }
  };
  await removeListings('Ebay', () => removeFromEbay(sales));
  await removeListings('Sportlots', () => removeFromSportLots(groupedCards));
  await removeListings('Buy Sports Cards', () => removeFromBuySportsCards(groupedCards));
  await removeListings('Shopify', () => removeFromShopify(sales));
  await removeListings('My Card Post', () => removeFromMyCardPost(sales));
  await removeListings('MySlabs', () => removeFromMySlabs(sales));
  finishSpinner('remove-all', 'Completed removing listings from sites');

  showSpinner('launching', 'Launching all sales sites');
  for (const site of openSalesSites) {
    await open(site);
  }
  finishSpinner('launching', 'Launching all sales sites');

  //output a pick list
  finishSpinner('top-level', 'Completed sales processing');
  console.log(
    chalkTable(
      {
        leftPad: 2,
        columns: [
          { field: 'sport', name: 'Sport' },
          { field: 'year', name: 'Year' },
          // { field: 'setName', name: 'Set' },
          // { field: 'parallel', name: chalk.green('Parallel') },
          // { field: 'insert', name: chalk.blue('Insert') },
          // { field: 'cardNumber', name: 'Card #' },
          { field: 'quantity', name: 'Count' },
          { field: 'title', name: 'Title' },
          { field: 'platform', name: 'Sold On' },
        ],
      },
      await buildTableData(groupedCards),
    ),
  );
} catch (e) {
  errorSpinner('top-level', 'Failed to run sales processing');
  pauseSpinners();
  throw e;
} finally {
  await shutdown();
}
