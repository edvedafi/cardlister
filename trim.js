import dotenv from 'dotenv';
import { loadTeams } from './src/utils/teams.js';
import { getSetData, initializeAnswers } from './src/card-data/cardData.js';
import 'zx/globals';
import { getFiles, getInputs } from './src/utils/inputs.js';
import processSingles from './src/singles.js';
import initializeFirebase from './src/utils/firebase.js';
import { shutdownSportLots } from './src/listing-sites/sportlots.js';
import { shutdownBuySportsCards } from './src/listing-sites/bsc.js';
import { shutdownFirebase } from './src/listing-sites/firebase.js';
import { shutdownMyCardPost } from './src/listing-sites/mycardpost.js';
import chalk from 'chalk';
import { useSpinners } from './src/utils/spinners.js';

dotenv.config();

$.verbose = false;

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

const log = (...params) => console.log(chalk.cyan(...params));
const { showSpinner, finishSpinner, errorSpinner, updateSpinner } = useSpinners('trim', chalk.cyan);

showSpinner('trim', 'Processing Singles');

try {
  const app = initializeFirebase();
  await loadTeams(app);

  // Set up full run information
  let input_directory = await getInputs();
  const savedAnswers = await initializeAnswers(input_directory);

  const setData = await getSetData();

  //gather the list of files that we will process
  let files = [];
  if (input_directory !== 'input/bulk/') {
    files = await getFiles(input_directory);
  }

  await processSingles(savedAnswers, setData, files);
} finally {
  await shutdown();
  finishSpinner('trim', 'Completed Processing');
}
