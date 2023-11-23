import writeSportLotsOutput from './listing-sites/sportlots.js';
import { uploadToBuySportsCards } from './listing-sites/bsc.js';
import writeEbayFile from './listing-sites/ebay.js';
import writeShopifyFile from './listing-sites/shopify.js';
import uploadToShopify from './listing-sites/shopifyUpload.js';
import { createGroups } from './listing-sites/uploads.js';
import { uploadToMyCardPost } from './listing-sites/mycardpost.js';

async function writeOutputFiles(allCards, bulk) {
  const bulkGrouped = createGroups(allCards, bulk);
  await uploadToShopify(allCards);
  await writeSportLotsOutput(bulkGrouped);
  await uploadToBuySportsCards(bulkGrouped);
  await uploadToMyCardPost(allCards);
  await writeEbayFile(allCards);
}

export default writeOutputFiles;
