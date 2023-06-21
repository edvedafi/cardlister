import dotenv from 'dotenv';
import Queue from 'queue'

dotenv.config();

import terminalImage from 'terminal-image';
import {cert, initializeApp} from "firebase-admin/app";
import {loadTeams} from "./src/utils/teams.js";
import {ask, getInputDirectory} from "./src/utils/ask.js";
import {initializeStorage, prepareImageFile, processImageFile} from "./src/image-processing/imageProcessor.js";
import {cardDataExistsForRawImage, getCardData, getSetData, initializeAnswers} from "./src/card-data/cardData.js";
import imageRecognition from "./src/card-data/imageRecognition.js";
import 'zx/globals';
import {readFileSync} from 'fs';
import writeOutputFiles from "./src/writeFiles.js";

$.verbose = false;

//instantiate firebase
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

// set up the queues
const queueReadImage = new Queue({results: [], autostart: true, concurrency: 1});
const queueGatherData = new Queue({results: [], autostart: true, concurrency: 1});
const queueImageFiles = new Queue({results: [], autostart: true, concurrency: 3});

//some debugging listeners
// const debugQueue = (name, queue) => {
//   queue.addEventListener('start', (job) => {
//     console.log(`${name} Queue Started: `, job);
//   });
//   queue.addEventListener('success', (result) => {
//     console.log(`${name} Queue success: `, result);
//   });
//   queue.addEventListener('error', (error, job) => {
//     console.log(`${name} Queue error: `, error, job);
//   });
//   queue.addEventListener('timeout', (next, job) => {
//     console.log(`${name} Queue timeout: `, next, job);
//   });
//   queue.addEventListener('end', (err) => {
//     console.log(`${name} Queue end: `, err);
//   });
// }
// debugQueue('read', queueReadImage);
// debugQueue('gather data', queueGatherData);
// debugQueue('images', queueImageFiles);

//Here we run the actual process
const preProcessPair = async (front, back) => {
  let imageDefaults;
  try {
    // console.log('here!', front)
    if (!cardDataExistsForRawImage(front, allCards)) {
      // console.log('here2')
      imageDefaults = await imageRecognition(front, back, setData);
      queueGatherData.push(() => processPair(front, back, imageDefaults));
    }
  } catch (e) {
    console.error('Failed while Preprocessing Card Data', front, back, imageDefaults)
    console.error(e)
    throw e;
  }
}

const processPair = async (front, back, imageDefaults) => {
  try {
    if (!cardDataExistsForRawImage(front, allCards)) {
      console.log(await terminalImage.file(front, {height: 25}));
      if (back) {
        console.log(await terminalImage.file(back, {height: 25}));
      }
      await processImage(front, imageDefaults, 1);
      if (back) {
        await processImage(back, imageDefaults, 2);
      }
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
}

const processImage = async (image, imageDefaults) => {
  try {
    const cardData = await getCardData(image, allCards, imageDefaults);
    imageDefaults.cardNumber = cardData.cardNumber; //ick fix this side effect coding
    const outputFile = await prepareImageFile(image, cardData, overrideImages);
    if (outputFile) {
      const filename = cardData.filename;
      queueImageFiles.push(() => processImageFile(outputFile, filename));
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
}

try {
  let i = 0;
  console.log('Processing files: ', files);
  while (i < files.length - 1) {

    //move on to the next files
    const front = files[i++];
    let back;
    if (i < files.length - 1) {
      back = files [i++];
    }
    queueReadImage.push(() => preProcessPair(front, back));
  }

  //wait for the 3 queues to finish before writing any outupt
  console.log('wait for the queues!')
  if (queueReadImage.length > 0) {
    await new Promise(resolve => queueReadImage.addEventListener('end', resolve));
  }
  if (queueGatherData.length > 0) {
    await new Promise(resolve => queueGatherData.addEventListener('end', resolve));
  }
  if (queueImageFiles.length > 0) {
    await new Promise(resolve => queueImageFiles.addEventListener('end', resolve));
  }

  //write the output
  await writeOutputFiles(allCards);
} catch (e) {
  console.log(e);
} finally {
  //print all the title values in allCards
  Object.values(allCards).forEach(t => console.log(t.title));
}
