import { getEbaySales, removeFromEbay } from './listing-sites/ebay.js';
import dotenv from 'dotenv';
import 'zx/globals';
import { createGroups } from './listing-sites/uploads.js';
import chalk from 'chalk';
import { removeFromShopify } from './listing-sites/shopifyUpload.js';
import { removeFromSportLots } from './listing-sites/sportlots.js';
import { removeFromMyCardPost } from './listing-sites/mycardpost.js';
import { removeFromBuySportsCards } from './listing-sites/bsc.js';

$.verbose = false;

dotenv.config();

const sales = [];
//gather sales
console.log(chalk.cyan('Gather listings from sites'));
await Promise.all([getEbaySales()]).then((results) => results.forEach((result) => sales.push(...result)));
console.log(chalk.cyan('Found'), chalk.green(sales.length), chalk.cyan('cards sold'));
// console.log(JSON.stringify(sales, null, 2));

//remove listings from sites
console.log(chalk.cyan('Remove listings from sites'));
const groupedCards = createGroups({}, sales);
await Promise.all([
  removeFromEbay(sales),
  removeFromShopify(sales),
  removeFromSportLots(groupedCards),
  removeFromMyCardPost(sales),
  removeFromBuySportsCards(groupedCards),
]);
console.log(chalk.cyan('Completed removing listings from sites'));

//output a pick list
console.log(chalk.cyan('All Sales:'));

sales.forEach((sale) => {
  console.log(chalk.green(sale.title), chalk.yellow(sale.quantity));
});
