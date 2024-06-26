import dotenv from 'dotenv';
import 'zx/globals';
import minimist from 'minimist';
import { login as sportlotsLogin, shutdownSportLots } from './listing-sites/sportlots.js';
import { login as bscLogin, shutdownBuySportsCards } from './listing-sites/bsc.js';
import { shutdownFirebase } from './listing-sites/firebase.js';
import { shutdownMyCardPost } from './listing-sites/mycardpost.js';
import initializeFirebase from './utils/firebase.js';
import { loadTeams } from './utils/teams.js';
import { assignIds } from './card-data/setData.js';

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

initializeFirebase();

await Promise.all([loadTeams(), sportlotsLogin(), bscLogin()]);

try {
  await assignIds();
} finally {
  await shutdown();
}
