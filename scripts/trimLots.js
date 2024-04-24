import dotenv from 'dotenv';
dotenv.config();

import { loadTeams } from './src/utils/teams.js';
import { initializeAnswers } from './src/card-data/cardData.js';
import 'zx/globals';
import { getFiles, getInputs } from './src/utils/inputs.js';
import initializeFirebase from './src/utils/firebase.js';
import { initializeStorage } from './src/listing-sites/firebase.js';
import processLots from './src/lots.js';

$.verbose = false;

const firebase = initializeFirebase();
initializeStorage(firebase);
await loadTeams(firebase);

// Set up full run information
let input_directory = await getInputs();
const savedAnswers = await initializeAnswers(input_directory);

//gather the list of files that we will process
const files = await getFiles(input_directory);

await processLots(savedAnswers, files);
