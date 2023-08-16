import writeOutputFiles from "./writeFiles.js";
import Queue from "queue";
import { cardDataExistsForRawImage, getLotData } from "./card-data/cardData.js";
import imageRecognition from "./card-data/imageRecognition.js";
import terminalImage from "terminal-image";
import {
  prepareImageFile,
  processImageFile,
} from "./image-processing/imageProcessor.js";
import writeEbayFile from "./listing-sites/ebay.js";
import writeShopifyFile from "./listing-sites/shopify.js";
import uploadToShopify from "./listing-sites/shopifyUpload.js";
import { ask } from "./utils/ask.js";

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

let lotType = "Hall of Fame";

const preProcessImage = async (image, allCards) => {
  let imageDefaults;
  try {
    // console.log('here!', front)
    if (!cardDataExistsForRawImage(image, allCards)) {
      // console.log('here2')
      imageDefaults = await imageRecognition(image);
      imageDefaults.lotType = lotType;
      queueGatherData.push(() => processImage(image, imageDefaults, allCards));
    }
  } catch (e) {
    console.error("Failed while Preprocessing Card Data", image, imageDefaults);
    console.error(e);
    throw e;
  }
};

const processImage = async (image, imageDefaults, allCards) => {
  try {
    console.log(await terminalImage.file(image, { height: 25 }));
    const cardData = await getLotData(imageDefaults, allCards);
    const outputFile = await prepareImageFile(image, cardData);
    if (outputFile) {
      const filename = cardData.filename;
      queueImageFiles.push(() => processImageFile(outputFile, filename));
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
};

async function processLots(savedAnswers, files) {
  const allCards = savedAnswers.allCardData || {};
  lotType = await ask("Lot Type?", lotType);
  try {
    console.log("Processing files: ", files);
    files.forEach((image) =>
      queueReadImage.push(() => preProcessImage(image, allCards)),
    );

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
    if (!hasQueueError) {
      await Promise.all([
        uploadToShopify(allCards),
        writeEbayFile(allCards),
        writeShopifyFile(allCards),
      ]);
    }
  } catch (e) {
    console.log(e);
  } finally {
    //print all the title values in allCards
    Object.values(allCards).forEach((t) => console.log(t.title));
  }
}

export default processLots;
