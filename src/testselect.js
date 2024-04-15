import dotenv from 'dotenv';
import 'zx/globals';
import minimist from 'minimist';
import { fixSLBins } from './listing-sites/firebase.js';
import initializeFirebase from './utils/firebase.js';

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
//   process.on(signal, () =>
//     shutdown().then(() => {
//       process.exit();
//     }),
//   ),
// );

initializeFirebase();
// await Promise.all([
//   loadTeams(),
//   // sportlotsLogin(), bscLogin()
// ]);

await fixSLBins();
// try {
//   await createNonStreamingMultipartContent([
//     './input/Photos-001__40_/PXL_20240402_003548269.jpg',
//     './input/Photos-001__40_/PXL_20240402_003558704.jpg',
//   ]);
// } finally {
//   await shutdown();
// }

