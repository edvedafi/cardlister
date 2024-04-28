import dotenv from 'dotenv';
import 'zx/globals';
import minimist from 'minimist';
import Medusa from '@medusajs/medusa-js';

const args = minimist(process.argv.slice(2));

$.verbose = false;

dotenv.config();

// let isShuttingDown = false;
// const shutdown = async () => {
//   if (!isShuttingDown) {
//     isShuttingDown = true;
//     await Promise.all([shutdownSportLots(), shutdownBuySportsCards(), shutdownFirebase(), shutdownMyCardPost()]);
//   }
// };
//
// ['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) =>
//   process.on(
//     signal,
//     async () =>
//       await shutdown().then(() => {
//         process.exit();
//       }),
//   ),
// );
//
// initializeFirebase();
//
// await Promise.all([loadTeams(), sportlotsLogin(), bscLogin()]);

// try {
//   await assignIds();
// } finally {
//   await shutdown();
// }

// Install the JS Client in your storefront project: @medusajs/medusa-js

const medusa = new Medusa({
  publishableApiKey: process.env.MEDUSA_API_KEY,
});
const response = await medusa.products.retrieve('prod_01HWANPETHK5QFZ4WTESQ5EYBS');
console.log(response.product.id);
