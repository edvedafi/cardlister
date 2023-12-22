import writeSportLotsOutput, { shutdownSportLots } from './listing-sites/sportlots.js';
import { shutdownBuySportsCards, uploadToBuySportsCards } from './listing-sites/bsc.js';
import { ebayAPIUpload } from './listing-sites/ebay.js';
import uploadToShopify from './listing-sites/shopifyUpload.js';
import { createGroups } from './listing-sites/uploads.js';
import { uploadToMyCardPost } from './listing-sites/mycardpost.js';
import { shutdownFirebase, uploadToFirebase } from './listing-sites/firebase.js';
import { ask } from './utils/ask.js';

async function writeOutputFiles(allCards, bulk, restart = false) {
  const bulkGrouped = await createGroups(allCards, bulk);
  // console.log('bulkGrouped', bulkGrouped);

  if (!restart || (await ask('Upload to Firebase?', true))) {
    await uploadToFirebase(allCards);
  }
  if (!restart || (await ask('Upload to Shopify?', true))) {
    await uploadToShopify(allCards);
  }
  if (!restart || (await ask('Upload to SportLots?', true))) {
    await writeSportLotsOutput(bulkGrouped);
  }
  if (!restart || (await ask('Upload to BuySportCards?', true))) {
    await uploadToBuySportsCards(bulkGrouped);
  }
  if (!restart || (await ask('Upload to My Card Post?', true))) {
    await uploadToMyCardPost(allCards);
  }
  if (!restart || (await ask('Upload to Ebay?', true))) {
    await ebayAPIUpload(allCards);
  }
}

export default writeOutputFiles;
