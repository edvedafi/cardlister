import dotenv from 'dotenv';
dotenv.config();

import { loadTeams } from './src/utils/teams.js';
import { initializeStorage } from './src/image-processing/imageProcessor.js';
import { getSetData, initializeAnswers } from './src/card-data/cardData.js';
import 'zx/globals';
import { getFiles, getInputs } from './src/utils/inputs.js';
import processSingles from './src/singles.js';
import initializeFirebase from './src/utils/firebase.js';
import { shutdownSportLots } from './src/listing-sites/sportlots.js';
import { shutdownBuySportsCards } from './src/listing-sites/bsc.js';
import { shutdownFirebase } from './src/listing-sites/firebase.js';
import { shutdownMyCardPost } from './src/listing-sites/mycardpost.js';

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

try {
  const app = initializeFirebase();
  initializeStorage(app);
  await loadTeams(app);

  // Set up full run information
  let input_directory = await getInputs();
  const savedAnswers = await initializeAnswers(input_directory);

  const setData = await getSetData();

  //gather the list of files that we will process
  let files = [];
  console.log(input_directory);
  if (input_directory !== 'input/bulk/') {
    files = await getFiles(input_directory);
  }

  await processSingles(savedAnswers, setData, files);
} finally {
  await shutdown();
}
