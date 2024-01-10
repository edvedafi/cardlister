import Queue from 'queue';
import { addCardData, cardDataExistsForRawImage, getCardData } from './card-data/cardData.js';
import imageRecognition from './card-data/imageRecognition.js';
import terminalImage from 'terminal-image';
import { ask } from './utils/ask.js';
import { prepareImageFile } from './image-processing/imageProcessor.js';
import writeOutputFiles from './writeFiles.js';
import collectBulkListings from './bulk.js';
import chalk from 'chalk';
import { useSpinners } from './utils/spinners.js';
import { processImageFile } from './listing-sites/firebase.js';

// set up the queues
const queueReadImage = new Queue({
  results: [],
  autostart: true,
  concurrency: 1,
});
const queueGatherData = new Queue({
  results: [],
  autostart: true,
  concurrency: 1,
});
const queueImageFiles = new Queue({
  results: [],
  autostart: true,
  concurrency: 3,
});

const log = (...params) => console.log(chalk.cyan(...params));
const { showSpinner, finishSpinner, errorSpinner, updateSpinner, pauseSpinners, resumeSpinners } = useSpinners(
  'singles',
  chalk.cyan,
);

async function processSingles(savedAnswers, setData, files) {
  showSpinner('singles', 'Processing Singles');
  const overrideImages = savedAnswers.metadata.reprocessImages;
  const allCards = savedAnswers.allCardData || {};
  try {
    let i = 0;
    updateSpinner('singles', `Processing ${files.length / 2} Cards`);
    updateSpinner('singles-details', `Processing ${files.length / 2} Cards`);

    updateSpinner('singles-details', `Setting up Queues`);
    while (i < files.length - 1) {
      //move on to the next files
      const front = files[i++];
      let back;
      if (i < files.length) {
        back = files[i++];
      }
      queueReadImage.push(() => preProcessPair(front, back, allCards, setData, overrideImages));
    }

    //wait for the 3 queues to finish before writing any output
    let hasQueueError = false;
    const watchForError = (name, queue) =>
      queue.addEventListener('error', (error, job) => {
        hasQueueError = true;
        console.log(`${name} Queue error: `, error, job);
        queueReadImage.stop();
        queueGatherData.stop();
        queueImageFiles.stop();
      });
    watchForError('Read', queueReadImage);
    watchForError('Gather', queueGatherData);
    watchForError('Process Images', queueImageFiles);

    updateSpinner('singles-details', `Waiting for the queues to finish`);
    updateSpinner('singles-details-image-queue', `Waiting for the Image Queue to finish`);
    if (queueReadImage.length > 0 && !hasQueueError) {
      await new Promise((resolve) => queueReadImage.addEventListener('end', resolve));
      finishSpinner('singles-details-image-queue', `Image Queue finished`);
    } else if (hasQueueError) {
      errorSpinner('singles-details-image-queue', `Image Queue errored`);
    } else {
      finishSpinner('singles-details-image-queue', `No image queue to wait for`);
    }

    updateSpinner('singles-details-data-queue', `Waiting for the Data Queue to finish`);
    if (queueGatherData.length > 0 && !hasQueueError) {
      await new Promise((resolve) => queueGatherData.addEventListener('end', resolve));
      finishSpinner('singles-details-data-queue', `Data Queue finished`);
    } else if (hasQueueError) {
      errorSpinner('singles-details-data-queue', `Data Queue errored`);
    } else {
      finishSpinner('singles-details-data-queue', `No data queue to wait for`);
    }

    updateSpinner('singles-details-file-queue', `Waiting for the File Queue to finish`);
    if (queueImageFiles.length > 0 && !hasQueueError) {
      await new Promise((resolve) => queueImageFiles.addEventListener('end', resolve));
      finishSpinner('singles-details-file-queue', `File Queue finished`);
    } else if (hasQueueError) {
      errorSpinner('singles-details-file-queue', `File Queue errored`);
    } else {
      finishSpinner('singles-details-file-queue', `No File Queue to wait for`);
    }

    //write the output
    if (hasQueueError) {
      errorSpinner('singles-details', `Queue errored: ${hasQueueError}`);
    } else {
      updateSpinner('singles-details', `Writing output files`);

      const bulk = await collectBulkListings(savedAnswers, setData);
      await writeOutputFiles(allCards, bulk);

      finishSpinner('singles-details');
    }
    finishSpinner('singles', 'Completed Singles Processing');
  } catch (e) {
    finishSpinner('singles-details');
    errorSpinner('singles', `Failed to process singles: ${e.message}`);
    console.log(e);
  } finally {
    //print all the title values in allCards
    Object.values(allCards).forEach((t) => console.log(t.title));
  }
}

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
const preProcessPair = async (front, back, allCards, setData, overrideImages) => {
  showSpinner(`singles-preprocess-${front}`, `Pre-Processing ${front}/${back}`);
  const spin = (message) => updateSpinner(`singles-preprocess-${front}`, `Pre-Processing ${front}/${back}: ${message}`);
  let imageDefaults;
  try {
    spin(`Checking for existing data`);
    if (!cardDataExistsForRawImage(front, allCards)) {
      spin(`Getting image recognition data`);
      imageDefaults = await imageRecognition(front, back, setData);
      spin(`Queueing next step`);
      queueGatherData.push(() => processPair(front, back, imageDefaults, allCards, overrideImages));
    }
    finishSpinner(`singles-preprocess-${front}`, `Pre-Processed ${front}/${back}`);
  } catch (e) {
    errorSpinner(`singles-preprocess-${front}`, `Failed to Pre-Process ${front}/${back}: ${e.message}`);
    throw e;
  }
};

const processPair = async (front, back, imageDefaults, allCards, overrideImages) => {
  const spinners = pauseSpinners();
  try {
    if (!cardDataExistsForRawImage(front, allCards)) {
      pauseSpinners();
      console.log(await terminalImage.file(front, { height: 25 }));
      if (back) {
        console.log(await terminalImage.file(back, { height: 25 }));
      }
      resumeSpinners();
      await addCardData('Card Number', imageDefaults, 'cardNumber', imageDefaults);
      const oldCard = allCards[imageDefaults.sku];
      if (oldCard) {
        const addImages = await ask('Add Images to existing card?', false);
        if (addImages) {
          imageDefaults.key = imageDefaults.sku;
        } else {
          imageDefaults.key = `${oldCard.sku}b`;
        }
      } else {
        imageDefaults.key = imageDefaults.sku || `${imageDefaults.bin}|${imageDefaults.cardNumber}`;
      }
      const frontData = await processImage(front, imageDefaults, allCards, overrideImages);
      if (back) {
        await processImage(back, frontData, allCards, overrideImages);
      }
    }
  } catch (e) {
    console.error(e);
    resumeSpinners(spinners);
    throw e;
  } finally {
    resumeSpinners(spinners);
  }
};

const processImage = async (image, imageDefaults, allCards, overrideImages) => {
  try {
    const cardData = await getCardData(allCards, imageDefaults);
    const outputFile = await prepareImageFile(image, cardData, overrideImages);
    if (outputFile) {
      const filename = cardData.filename;
      queueImageFiles.push(() => processImageFile(outputFile, filename));
    }
    return cardData;
  } catch (e) {
    console.error(e);
    throw e;
  }
};

export default processSingles;
