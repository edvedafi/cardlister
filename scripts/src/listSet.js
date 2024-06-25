import { useSpinners } from './utils/spinners.js';
import chalk from 'chalk';
import Queue from 'queue';
import { getCardData, saveBulk, saveListing } from './card-data/cardData.js';
import imageRecognition from './card-data/imageRecognition.js';
import terminalImage from 'terminal-image';
import { prepareImageFile } from './image-processing/imageProcessor.js';
import { processImageFile } from './listing-sites/firebase.js';
import { getProducts, startSync } from './listing-sites/medusa.js';
import { ask } from './utils/ask.js';

const { showSpinner, log } = useSpinners('list-set', chalk.cyan);

const listings = [];
const queueReadImage = new Queue({
  results: [],
  autostart: true,
  concurrency: 3,
});
const queueGatherData = new Queue({
  results: [],
  autostart: true,
  concurrency: 1,
});
const queueImageFiles = new Queue({
  results: listings,
  autostart: true,
  concurrency: 3,
});

const preProcessPair = async (front, back, setData) => {
  const { update, finish, error } = showSpinner(`singles-preprocess-${front}`, `Pre-Processing ${front}/${back}`);
  try {
    update(`Getting image recognition data`);
    const imageDefaults = await imageRecognition(front, back, setData);
    update(`Queueing next step`);
    queueGatherData.push(() => processPair(front, back, imageDefaults, setData));
    finish();
  } catch (e) {
    error(e);
    throw e;
  }
};

const processPair = async (front, back, imageDefaults, setData) => {
  try {
    log(await terminalImage.file(front, { height: 25 }));
    if (back) {
      log(await terminalImage.file(back, { height: 25 }));
    }

    const { productVariant, quantity } = await getCardData(setData, imageDefaults);
    const images = [];
    const frontImage = await prepareImageFile(front, productVariant, setData, 1);
    if (frontImage) {
      images.push({
        file: frontImage,
        url: `https://firebasestorage.googleapis.com/v0/b/hofdb-2038e.appspot.com/o/${productVariant.product.handle}1.jpg}?alt=media`,
      });
    }
    if (back) {
      const backImage = await prepareImageFile(back, productVariant, setData, 2);
      if (backImage) {
        images.push({
          file: backImage,
          url: `https://firebasestorage.googleapis.com/v0/b/hofdb-2038e.appspot.com/o/${productVariant.product.handle}2.jpg}?alt=media`,
        });
      }
    }

    queueImageFiles.push(() => processUploads(productVariant, images, quantity));

    return { productVariant, quantity, images };
  } catch (e) {
    console.error(e);
    throw e;
  }
};

const processUploads = async (productVariant, imageInfo, quantity) => {
  const images = await Promise.all(
    imageInfo.map(async (image, i) => {
      const uploadedFileName = `${productVariant.product.handle}${i + 1}.jpg`;
      await processImageFile(image.file, uploadedFileName);
      return uploadedFileName;
    }),
  );
  await saveListing(productVariant, images, quantity);
  return productVariant;
};

const processBulk = async (setData) => {
  const { update, finish, error } = showSpinner('bulk', `Processing Bulk Listings`);
  log('Adding Bulk Listings');
  try {
    //TODD needs to handle variations
    log(listings);
    const listedProducts = listings.map((listing) => listing.id);
    for (let i = 0; i < setData.products.length; i++) {
      const product = setData.products[i];
      for (let j = 0; j < product.variants.length; j++) {
        const variant = product.variants[j];
        if (!listedProducts.includes(variant.id)) {
          const createListing = await ask(product.title, 0);
          if (createListing > 0) {
            await saveBulk(product, variant, createListing);
          }
        }
      }
    }
    finish();
  } catch (e) {
    error(e);
    throw e;
  }
};

export async function processSet(setData, files) {
  const {
    update: updateSpinner,
    finish: finishSpinner,
    error: errorSpinner,
  } = showSpinner('list-set', `Processing Images`);
  let count = files.length / 2;
  let current = 0;
  queueReadImage.addEventListener('success', () => {
    current++;
    updateSpinner(`${current}/${count}`);
  });

  updateSpinner('Prepping Queues for AI');
  try {
    let i = 0;
    log(setData);
    log(files);

    setData.products = await getProducts(setData.category.id);

    while (i < files.length - 1) {
      const front = files[i++];
      let back;
      if (i < files.length) {
        back = files[i++];
      }
      queueReadImage.push(() => preProcessPair(front, back, setData));
    }

    let hasQueueError = false;
    const watchForError = (name, queue) =>
      queue.addEventListener('error', (error, job) => {
        hasQueueError = true;
        log(`${name} Queue error: `, error, job);
        queueReadImage.stop();
        queueGatherData.stop();
        queueImageFiles.stop();
        throw new Error('Queue Error');
      });
    watchForError('Read', queueReadImage);
    watchForError('Gather', queueGatherData);
    watchForError('Process Images', queueImageFiles);

    const { finish: finishImage, error: errorImage } = showSpinner('image', `Waiting for Image Queue to finish`);
    if (queueReadImage.length > 0 && !hasQueueError) {
      await new Promise((resolve) => queueReadImage.addEventListener('end', resolve));
      finishImage();
    } else if (hasQueueError) {
      errorImage(`Image Queue errored`);
    } else {
      finishImage();
    }

    const { finish: finishData, error: errorData } = showSpinner('data', `Waiting for Data Queue to finish`);
    if (queueGatherData.length > 0 && !hasQueueError) {
      await new Promise((resolve) => queueGatherData.addEventListener('end', resolve));
      finishData();
    } else if (hasQueueError) {
      errorData(`Data Queue errored`);
    } else {
      finishData();
    }

    const { finish: finishFile, error: errorFile } = showSpinner('file', `Waiting for File Queue to finish`);
    if (queueImageFiles.length > 0 && !hasQueueError) {
      await new Promise((resolve) => queueImageFiles.addEventListener('end', resolve));
      finishFile();
    } else if (hasQueueError) {
      errorFile(`File Queue errored`);
    } else {
      finishFile();
    }

    //write the output
    if (hasQueueError) {
      errorSpinner(hasQueueError);
    } else {
      updateSpinner(`Process Bulk`);
      await processBulk(setData);
      updateSpinner(`Kickoff Set Processing`);
      await startSync(setData.category.id);
    }
    finishSpinner('Completed Set Processing');
  } catch (error) {
    errorSpinner(error);
  }
}
