import writeSportLotsOutput from './listing-sites/sportlots.js';
import { uploadToBuySportsCards } from './listing-sites/bsc.js';
import writeEbayFile from './listing-sites/ebay.js';
import uploadToShopify from './listing-sites/shopifyUpload.js';
import { createGroups } from './listing-sites/uploads.js';
import { uploadToMyCardPost } from './listing-sites/mycardpost.js';
import { uploadToFirebase } from './listing-sites/firebase.js';

async function writeOutputFiles(allCards, bulk) {
  const bulkGrouped = createGroups(allCards, bulk);
  await uploadToFirebase(allCards);
  await uploadToShopify(allCards);
  await writeSportLotsOutput(bulkGrouped);
  await uploadToBuySportsCards(bulkGrouped);
  await uploadToMyCardPost(allCards);
  await writeEbayFile(allCards);
}

export default writeOutputFiles;
