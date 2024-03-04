import dotenv from 'dotenv';
import { loadTeams } from './src/utils/teams.js';
import { getSetData, initializeAnswers } from './src/card-data/cardData.js';
import 'zx/globals';
import { getFiles, getInputs } from './src/utils/inputs.js';
import processSingles from './src/singles.js';
import initializeFirebase from './src/utils/firebase.js';
import { login as sportslotLogin, shutdownSportLots } from './src/listing-sites/sportlots.js';
import { login as bscLogin, shutdownBuySportsCards } from './src/listing-sites/bsc.js';
import { shutdownFirebase } from './src/listing-sites/firebase.js';
import { login as mcpLogin, shutdownMyCardPost } from './src/listing-sites/mycardpost.js';
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

const { showSpinner, log } = useSpinners('trim', chalk.cyan);

const { update, finish, error } = showSpinner('trim', 'Processing Singles');

try {
  update('Logging in');
  await Promise.all([loadTeams(initializeFirebase()), sportslotLogin(), bscLogin(), mcpLogin()]);

  // Set up full run information
  update('Gathering Inputs');
  let input_directory = await getInputs();
  update('Initializing Answers');
  const savedAnswers = await initializeAnswers(input_directory);
  update('Gathering Set Data');
  const setData = await getSetData();

  //gather the list of files that we will process
  let files = [];
  if (input_directory !== 'input/bulk/') {
    files = await getFiles(input_directory);
  }

  update('Processing Singles');
  await processSingles(savedAnswers, setData, files);
} catch (e) {
  error(e);
} finally {
  await shutdown();
  finish('Completed Processing');
}
