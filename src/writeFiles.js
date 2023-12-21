import writeSportLotsOutput, { shutdownSportLots } from './listing-sites/sportlots.js';
import { shutdownBuySportsCards, uploadToBuySportsCards } from './listing-sites/bsc.js';
import { ebayAPIUpload } from './listing-sites/ebay.js';
import uploadToShopify from './listing-sites/shopifyUpload.js';
import { createGroups } from './listing-sites/uploads.js';
import { uploadToMyCardPost } from './listing-sites/mycardpost.js';
import { shutdownFirebase, uploadToFirebase } from './listing-sites/firebase.js';
import { ask } from './utils/ask.js';

const shutdown = async () => {
  await Promise.all([shutdownSportLots(), shutdownBuySportsCards(), shutdownFirebase()]);
};
async function writeOutputFiles(allCards, bulk, restart = false) {
  process.on('SIGINT', async function () {
    await shutdown();
    process.exit();
  });

  try {
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
  } finally {
    await shutdown();
  }
}

export default writeOutputFiles;
