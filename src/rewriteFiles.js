import { initializeAnswers } from './card-data/cardData.js';
import 'zx/globals';
import dotenv from 'dotenv';
import { getInputs } from './utils/inputs.js';
import writeFiles from './writeFiles.js';
import minimist from 'minimist';
import { shutdownSportLots } from './listing-sites/sportlots.js';
import { shutdownBuySportsCards } from './listing-sites/bsc.js';
import { shutdownFirebase } from './listing-sites/firebase.js';
import { shutdownMyCardPost } from './listing-sites/mycardpost.js';

$.verbose = false;

const args = minimist(process.argv.slice(2));

dotenv.config();

let isShuttingDown = false;
const shutdown = async () => {
  if (!isShuttingDown) {
    isShuttingDown = true;
    await Promise.all([shutdownSportLots(), shutdownBuySportsCards(), shutdownFirebase(), shutdownMyCardPost()]);
  }
};

['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) =>
  process.on(signal, () =>
    shutdown().then(() => {
      process.exit();
    }),
  ),
);

try {
  const inputDirectory = await getInputs();
  const savedAnswers = await initializeAnswers(inputDirectory, true);

  await writeFiles(savedAnswers.allCardData, savedAnswers.bulk, args.r);
} finally {
  await shutdown();
}
