import { getEbaySales } from './listing-sites/ebay.js';
import dotenv from 'dotenv';
import 'zx/globals';
import { createGroups } from './listing-sites/uploads.js';
$.verbose = false;

dotenv.config();

const sales = [];
//gather sales
console.log(chalk.magenta('Remove listings from sites'));
const salesResults = await Promise.all([getEbaySales()]);

salesResults.forEach((result) => {
  sales.push(...result);
});

//remove listings from sites
console.log(chalk.magenta('Remove listings from sites'));
console.log(JSON.stringify(sales, null, 2));
// const groupedCards = createGroups({}, sales);
// await Promise.all([removeFromEbay(sales)]);

//output a pick list
console.log(chalk.magenta('All Sales:'));

sales.forEach((sale) => {
  console.log(chalk.green(sale.title), chalk.yellow(sale.quantity));
});
