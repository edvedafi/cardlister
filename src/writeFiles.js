import { createGroups } from './listing-sites/uploads.js';
import { ask } from './utils/ask.js';
import { uploadToMySlabs } from './listing-sites/myslabs.js';
import { uploadToFirebase } from './listing-sites/firebase.js';
import uploadToShopify from './listing-sites/shopifyUpload.js';
import { uploadToBuySportsCards } from './listing-sites/bsc.js';
import { uploadToMyCardPost } from './listing-sites/mycardpost.js';
import { ebayAPIUpload } from './listing-sites/ebay.js';
import enterIntoSportLotsWebsite from './listing-sites/sportlots.js';
import { useSpinners } from './utils/spinners.js';
import chalk from 'chalk';

const { showSpinner, finishSpinner } = useSpinners('writeFiles', chalk.cyan);

async function writeOutputFiles(allCards, bulk, restart = false) {
  showSpinner('uploads', 'Uploading data to listing sites');

  const bulkGrouped = await createGroups(allCards, bulk);

  if (!restart || (await ask('Upload to Firebase?', true))) {
    await uploadToFirebase(allCards);
  }
  if (!restart || (await ask('Upload to Shopify?', true))) {
    await uploadToShopify(allCards);
  }
  if (!restart || (await ask('Upload to SportLots?', true))) {
    await enterIntoSportLotsWebsite(bulkGrouped);
  }
  if (!restart || (await ask('Upload to BuySportCards?', true))) {
    await uploadToBuySportsCards(bulkGrouped);
  }
  if (!restart || (await ask('Upload to My Card Post?', true))) {
    await uploadToMyCardPost(allCards);
  }
  if (!restart || (await ask('Upload to My Slabs?', true))) {
    await uploadToMySlabs(allCards);
  }
  if (!restart || (await ask('Upload to Ebay?', true))) {
    await ebayAPIUpload(allCards);
  }

  finishSpinner('uploads', 'Finished uploading data to listing sites');
}

export default writeOutputFiles;
