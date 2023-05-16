#!/usr/bin/env zx
import terminalImage from 'terminal-image';
import {cert, initializeApp} from "firebase-admin/app";
import writeEbayFile from "./src/listing-sites/ebay.js";
import {loadTeams} from "./src/utils/teams.js";
import {ask} from "./src/utils/ask.js";
import {initializeStorage, processImageFile} from "./src/image-processing/imageProcessor.js";
import {getCardData, getSetData, initializeAnswers} from "./src/card-data/cardData.js";
import writeSportLotsOutput from "./src/listing-sites/sportlots.js";
import writeBuySportsCardsOutput from "./src/listing-sites/bsc.js";
import imageRecognition from "./src/card-data/imageRecognition.js";
import 'zx/globals';
import {readFileSync} from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const hofDBJSON = JSON.parse(readFileSync('./hofdb-2038e-firebase-adminsdk-jllij-4025146e4e.json'));
const firebaseConfig = {
  credential: cert(hofDBJSON),
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "hofdb-2038e.firebaseapp.com",
  projectId: "hofdb-2038e",
  storageBucket: "hofdb-2038e.appspot.com",
  messagingSenderId: "78796187147",
  appId: "1:78796187147:web:aa89f01d66d63dfc5d490e",
  measurementId: "G-4T1D5KNQ7N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
initializeStorage(app);
await loadTeams(app);


// Set up full run information
let input_directory = await ask('Input Directory', 'input');
if (input_directory === 'input') {
  input_directory = 'input/'
} else if (input_directory.indexOf('/') !== input_directory.length - 1) {
  input_directory = `input/${input_directory}/`;
} else {
  input_directory = `input/${input_directory}`;
}
console.log(`Input Directory: ${input_directory}`);
const savedAnswers = await initializeAnswers(input_directory);
const overrideImages = savedAnswers.metadata.reprocessImages;
const allCards = savedAnswers.allCardData || {};

const setData = await getSetData();

//gather the list of files that we will process
const lsOutput = await $`ls ${input_directory}PXL*.jpg`;
const files = lsOutput.toString().split('\n')

//Here we run the actual process
const processImage = async (image, imageDefaults, img_number) => {
  console.log(`Entering information for Image ${img_number}`);
  let cardData = await getCardData(allCards, imageDefaults);
  await processImageFile(image, cardData, overrideImages);
  console.log(`${image} -> ${cardData.filename} Complete`)
}

try {
  let i = 0;
  while (i < files.length - 1) {

    //move on to the next files
    const front = files[i++];
    let back;
    if (i < files.length - 1) {
      back = files [i++];
    }
    console.log(await terminalImage.file(front, {height: 25}), front);
    if (back) {
      console.log(await terminalImage.file(back, {height: 25}), back);
    }
    const imageDefaults = await imageRecognition(front, back, setData);
    await processImage(front, imageDefaults, 1);
    if (back) {
      await processImage(back, imageDefaults, 2);
    }
  }
  //write the output
  await writeSportLotsOutput(allCards);
  await writeBuySportsCardsOutput(allCards);
  await writeEbayFile(allCards);
} finally {
  //print all the title values in allCards
  Object.values(allCards).forEach(t => console.log(t.title));
}
