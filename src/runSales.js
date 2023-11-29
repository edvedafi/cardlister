import { getEbaySales, removeFromEbay } from './listing-sites/ebay.js';
import dotenv from 'dotenv';
import 'zx/globals';
import { createGroups } from './listing-sites/uploads.js';
import chalk from 'chalk';
import { removeFromShopify } from './listing-sites/shopifyUpload.js';
import { getSalesSportLots, removeFromSportLots } from './listing-sites/sportlots.js';
import { removeFromMyCardPost } from './listing-sites/mycardpost.js';
import { removeFromBuySportsCards } from './listing-sites/bsc.js';
import chalkTable from 'chalk-table';

$.verbose = false;

dotenv.config();

const sales = [];
//gather sales
console.log(chalk.cyan('Gather listings from sites'));
await Promise.all([getEbaySales(), getSalesSportLots()]).then((results) =>
  results.forEach((result) => sales.push(...result)),
);
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
    Object.keys(divider).forEach((key) => (divider[key] = '-'.repeat(Math.max(card[key].length, divider[key].length)))),
  ),
);

const displayCards = [];
let color = chalk.magenta;
Object.keys(groupedCards)
  .sort()
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
          Object.keys(card).forEach((key) => (card[key] = color(card[key])));
          return card;
        }),
    );
    color = color === chalk.magenta ? chalk.blueBright : chalk.magenta;
  });

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
    displayCards,
  ),
);
