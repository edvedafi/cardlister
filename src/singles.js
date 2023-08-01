import Queue from "queue";
import {
  addCardData,
  cardDataExistsForRawImage,
  getCardData,
} from "./card-data/cardData.js";
import imageRecognition from "./card-data/imageRecognition.js";
import terminalImage from "terminal-image";
import { ask } from "./utils/ask.js";
import {
  prepareImageFile,
  processImageFile,
} from "./image-processing/imageProcessor.js";
import writeOutputFiles from "./writeFiles.js";

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

async function processSingles(savedAnswers, setData, files) {
  const overrideImages = savedAnswers.metadata.reprocessImages;
  const allCards = savedAnswers.allCardData || {};
  try {
    let i = 0;
    console.log("Processing files: ", files);
    while (i < files.length - 1) {
      //move on to the next files
      const front = files[i++];
      let back;
      if (i < files.length - 1) {
        back = files[i++];
      }
      queueReadImage.push(() =>
        preProcessPair(front, back, allCards, setData, overrideImages),
      );
    }

    //wait for the 3 queues to finish before writing any output
    console.log("wait for the queues!");
    let hasQueueError = false;
    const watchForError = (name, queue) =>
      queue.addEventListener("error", (error, job) => {
        hasQueueError = true;
        console.log(`${name} Queue error: `, error, job);
        queueReadImage.stop();
        queueGatherData.stop();
        queueImageFiles.stop();
      });
    watchForError("Read", queueReadImage);
    watchForError("Gather", queueGatherData);
    watchForError("Process Images", queueImageFiles);

    if (queueReadImage.length > 0 && !hasQueueError) {
      await new Promise((resolve) =>
        queueReadImage.addEventListener("end", resolve),
      );
    } else {
      console.log(
        "Not waiting for queueReadImage",
        queueReadImage.length,
        hasQueueError,
      );
    }
    if (queueGatherData.length > 0 && !hasQueueError) {
      await new Promise((resolve) =>
        queueGatherData.addEventListener("end", resolve),
      );
    } else {
      console.log(
        "Not waiting for queueGatherData",
        queueGatherData.length,
        hasQueueError,
      );
    }
    if (queueImageFiles.length > 0 && !hasQueueError) {
      await new Promise((resolve) =>
        queueImageFiles.addEventListener("end", resolve),
      );
    } else {
      console.log(
        "Not waiting for queueImageFiles",
        queueImageFiles.length,
        hasQueueError,
      );
    }

    //write the output
    console.log(hasQueueError);
    if (!hasQueueError) {
      await writeOutputFiles(allCards);
    }
  } catch (e) {
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
const preProcessPair = async (
  front,
  back,
  allCards,
  setData,
  overrideImages,
) => {
  let imageDefaults;
  try {
    // console.log('here!', front)
    if (!cardDataExistsForRawImage(front, allCards)) {
      // console.log('here2')
      imageDefaults = await imageRecognition(front, back, setData);
      queueGatherData.push(() =>
        processPair(front, back, imageDefaults, allCards, overrideImages),
      );
    }
  } catch (e) {
    console.error(
      "Failed while Preprocessing Card Data",
      front,
      back,
      imageDefaults,
    );
    console.error(e);
    throw e;
  }
};

const processPair = async (
  front,
  back,
  imageDefaults,
  allCards,
  overrideImages,
) => {
  try {
    if (!cardDataExistsForRawImage(front, allCards)) {
      console.log(await terminalImage.file(front, { height: 25 }));
      if (back) {
        console.log(await terminalImage.file(back, { height: 25 }));
      }
      await addCardData(
        "Card Number",
        imageDefaults,
        "cardNumber",
        imageDefaults,
      );
      const oldCard = allCards[imageDefaults.cardNumber];
      if (oldCard) {
        const addImages = await ask("Add Images to existing card?", false);
        if (addImages) {
          imageDefaults.key = imageDefaults.cardNumber;
        } else {
          imageDefaults.key = `${oldCard.cardNumber}-${oldCard.setNmae}-${oldCard.insert}-${oldCard.parallel}-${oldCard.features}`;
        }
      } else {
        imageDefaults.key = imageDefaults.cardNumber;
      }
      await processImage(front, imageDefaults, allCards, overrideImages);
      if (back) {
        await processImage(back, imageDefaults, allCards, overrideImages);
      }
    }
  } catch (e) {
    console.error(e);
    throw e;
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
  } catch (e) {
    console.error(e);
    throw e;
  }
};

export default processSingles;
