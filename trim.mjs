#!/usr/bin/env zx
import terminalImage from 'terminal-image';
import {cert, initializeApp} from "firebase-admin/app";
import writeEbayFile from "./src/ebay.mjs";
import {loadTeams} from "./src/utils/teams.mjs";
import {ask, initializeAnswers} from "./src/ask.mjs";
import {initializeStorage, processImageFile} from "./src/imageProcessor.mjs";
import {getCardData, getSetData} from "./src/cardData.mjs";

const firebaseConfig = {
  credential: cert(require('./hofdb-2038e-firebase-adminsdk-jllij-4025146e4e.json')),
  apiKey: "AIzaSyDaaJXLcG-RaIJmi9mLXjwqcptcB3_IJRE",
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

const allCards = {};

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
await initializeAnswers(input_directory);
await getSetData()

//gather the list of files that we will process
const lsOutput = await $`ls ${input_directory}PXL*.jpg`;
const files = lsOutput.toString().split('\n')

//Here we run the actual process
const processImage = async (image, img_number) => {
  console.log(`Entering information for Image ${img_number}`);
  const cardData = await getCardData(allCards);
  await processImageFile(image, cardData);
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
    // console.log(await terminalImage.file(front, {height: 30}), front);
    // if (back) {
    //   console.log(await terminalImage.file(back, {height: 30}), back);
    // }
    await processImage(front, 1);
    if (back) {
      await processImage(back, 2);
    }
  }
  //write the output
  await writeEbayFile(allCards);
} finally {
  //print all the title values in allCards
  Object.values(allCards).forEach(t => console.log(t.title));
}
