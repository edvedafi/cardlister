import dotenv from "dotenv";
dotenv.config();

import { cert, initializeApp } from "firebase-admin/app";
import { loadTeams } from "./src/utils/teams.js";
import { initializeStorage } from "./src/image-processing/imageProcessor.js";
import { getSetData, initializeAnswers } from "./src/card-data/cardData.js";
import "zx/globals";
import { readFileSync } from "fs";
import { getInputs } from "./src/inputs.js";
import processSingles from "./src/singles.js";

$.verbose = false;

//instantiate firebase
const hofDBJSON = JSON.parse(
  readFileSync("./hofdb-2038e-firebase-adminsdk-jllij-4025146e4e.json"),
);
const firebaseConfig = {
  credential: cert(hofDBJSON),
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "hofdb-2038e.firebaseapp.com",
  projectId: "hofdb-2038e",
  storageBucket: "hofdb-2038e.appspot.com",
  messagingSenderId: "78796187147",
  appId: "1:78796187147:web:aa89f01d66d63dfc5d490e",
  measurementId: "G-4T1D5KNQ7N",
};
const app = initializeApp(firebaseConfig);
initializeStorage(app);
await loadTeams(app);

// Set up full run information
let input_directory = await getInputs();
const savedAnswers = await initializeAnswers(input_directory);

const setData = await getSetData();

//gather the list of files that we will process
const lsOutput = await $`ls ${input_directory}PXL*.jpg`;
const files = lsOutput.toString().split("\n");

await processSingles(savedAnswers, setData, files);
