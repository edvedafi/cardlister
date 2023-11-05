import writeSportLotsOutput from './listing-sites/sportlots.js';
import { uploadToBuySportsCards } from './listing-sites/bsc.js';
import writeEbayFile from './listing-sites/ebay.js';
import writeShopifyFile from './listing-sites/shopify.js';
import uploadToShopify from './listing-sites/shopifyUpload.js';
import { createGroups } from './listing-sites/uploads.js';

async function writeOutputFiles(allCards, bulk) {
  const bulkGrouped = createGroups(allCards, bulk);
  await uploadToShopify(allCards);
  await writeSportLotsOutput(allCards, bulk);
  await uploadToBuySportsCards(bulkGrouped);
  await writeEbayFile(allCards);
  await writeShopifyFile(allCards);
}

export default writeOutputFiles;
