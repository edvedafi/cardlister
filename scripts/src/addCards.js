import dotenv from 'dotenv';
import { getSetData, initializeAnswers } from './card-data/cardData.js';
import 'zx/globals';
import { getFiles, getInputs } from './utils/inputs.js';
import initializeFirebase from './utils/firebase.js';
import { shutdownSportLots } from './listing-sites/sportlots.js';
import { shutdownBuySportsCards } from './listing-sites/bsc.js';
import { shutdownFirebase } from './listing-sites/firebase.js';
import { shutdownMyCardPost } from './listing-sites/mycardpost.js';
import chalk from 'chalk';
import { useSpinners } from './utils/spinners.js';
import { onShutdown } from 'node-graceful-shutdown';
import { processSet } from './listSet.js';

dotenv.config();

$.verbose = false;

const shutdown = async () => {
  await Promise.all([shutdownSportLots(), shutdownBuySportsCards(), shutdownFirebase(), shutdownMyCardPost()]);
};

onShutdown(shutdown);

const { showSpinner, log } = useSpinners('addCards', chalk.cyan);

const { update, finish, error } = showSpinner('addCards', 'Adding Cards');

try {
  update('Logging in');
  initializeFirebase();

  // Set up full run information
  update('Gathering Inputs');
  let input_directory = await getInputs();
  update('Initializing Answers');
  const savedAnswers = await initializeAnswers(input_directory);
  update('Gathering Set Data');
  const setData = await getSetData(true);

  //gather the list of files that we will process
  let files = [];
  if (input_directory !== 'input/bulk/') {
    files = await getFiles(input_directory);
  }

  update('Processing Singles');
  await processSet(setData, files);
} catch (e) {
  error(e);
} finally {
  await shutdown();
  finish('Completed Processing');
}
