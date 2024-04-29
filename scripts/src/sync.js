import dotenv from 'dotenv';
import 'zx/globals';
import minimist from 'minimist';
import { findSet } from './card-data/setData.js';
import { shutdownSportLots } from './listing-sites/sportlots.js';
import { shutdownBuySportsCards } from './listing-sites/bsc.js';
import { shutdownFirebase } from './listing-sites/firebase.js';
import { shutdownMyCardPost } from './listing-sites/mycardpost.js';

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

['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) =>
  process.on(
    signal,
    async () =>
      await shutdown().then(() => {
        process.exit();
      }),
  ),
);

// initializeFirebase();
//
// await Promise.all([loadTeams(), sportlotsLogin(), bscLogin()]);

try {
  const set = await findSet();

  console.log(set);
} finally {
  await shutdown();
}
