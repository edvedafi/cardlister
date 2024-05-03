import dotenv from 'dotenv';
import 'zx/globals';
import minimist from 'minimist';
import { shutdownSportLots } from './listing-sites/sportlots.js';
import { shutdownBuySportsCards } from './listing-sites/bsc.js';
import { shutdownFirebase } from './listing-sites/firebase.js';
import { shutdownMyCardPost } from './listing-sites/mycardpost.js';
import { useSpinners } from './utils/spinners.js';
import { buildSet, findSet } from './card-data/setData.js';
import { ask } from './utils/ask.js';

const args = minimist(process.argv.slice(2));

$.verbose = false;

dotenv.config();

const { log } = useSpinners('Sync', chalk.lightcoral);

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
  // const set = await getCategory('pcat_01HWQACW0A7Q9XBEN1W84TJX3H');
  log(set);
  await ask('Continue?');
  await buildSet(set.variantName || set.variantType);
} finally {
  await shutdown();
}
