#!/usr/bin/env zx
import dotenv from 'dotenv';

dotenv.config();

import terminalImage from 'terminal-image';
import {cert, initializeApp} from "firebase-admin/app";
import {loadTeams} from "./src/utils/teams.js";
import {ask, getInputDirectory} from "./src/utils/ask.js";
import {initializeStorage, processImageFile} from "./src/image-processing/imageProcessor.js";
import {getCardData, getSetData, initializeAnswers} from "./src/card-data/cardData.js";
import imageRecognition from "./src/card-data/imageRecognition.js";
import 'zx/globals';
import {readFileSync} from 'fs';
import writeOutputFiles from "./src/writeFiles.js";


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
let input_directory = await getInputDirectory()
const savedAnswers = await initializeAnswers(input_directory);
const overrideImages = savedAnswers.metadata.reprocessImages;
const allCards = savedAnswers.allCardData || {};

const setData = await getSetData();

//gather the list of files that we will process
const lsOutput = await $`ls ${input_directory}PXL*.jpg`;
const files = lsOutput.toString().split('\n')

//Here we run the actual process
const processImage = async (image, imageDefaults) => {
  console.log(await terminalImage.file(image, {height: 25}));
  let cardData = await getCardData(image, allCards, imageDefaults);
  imageDefaults.cardNumber = cardData.cardNumber;
  await processImageFile(image, cardData, overrideImages);
  console.log(`${image} -> ${cardData.filename} Complete`)
}

const preProcessQueue = [];
const preProcessPair = async (front, back) => {
  const imageDefaults = await imageRecognition(front, back, setData);
  // processQueue.push(() => processPair(front, back, imageDefaults));
  return processPair(front, back, imageDefaults);
}

const processPair = async (front, back, imageDefaults) => {
  await processImage(front, imageDefaults, 1);
  if (back) {
    await processImage(back, imageDefaults, 2);
  }
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
    preProcessQueue.push(await preProcessPair(front, back));
  }

  await Promise.all(preProcessQueue);

  //write the output
  await writeOutputFiles(allCards);
} finally {
  //print all the title values in allCards
  Object.values(allCards).forEach(t => console.log(t.title));
}
