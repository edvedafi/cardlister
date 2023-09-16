import dotenv from "dotenv";
dotenv.config();

import { loadTeams } from "./src/utils/teams.js";
import { initializeStorage } from "./src/image-processing/imageProcessor.js";
import { getSetData, initializeAnswers } from "./src/card-data/cardData.js";
import "zx/globals";
import { getFiles, getInputs } from "./src/utils/inputs.js";
import processSingles from "./src/singles.js";
import initializeFirebase from "./src/utils/firebase.js";
import processBulk from "./src/bulk.js";

$.verbose = false;

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
if (input_directory !== "input/bulk/") {
  files = await getFiles(input_directory);
}

await processSingles(savedAnswers, setData, files);
