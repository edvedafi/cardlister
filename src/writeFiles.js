import { createGroups } from './listing-sites/uploads.js';
import { ask } from './utils/ask.js';
import { uploadToMySlabs } from './listing-sites/myslabs.js';

async function writeOutputFiles(allCards, bulk, restart = false) {
  const bulkGrouped = await createGroups(allCards, bulk);
  // console.log('bulkGrouped', bulkGrouped);
  //
  // if (!restart || (await ask('Upload to Firebase?', true))) {
  //   await uploadToFirebase(allCards);
  // }
  // if (!restart || (await ask('Upload to Shopify?', true))) {
  //   await uploadToShopify(allCards);
  // }
  // if (!restart || (await ask('Upload to SportLots?', true))) {
  //   await writeSportLotsOutput(bulkGrouped);
  // }
  // if (!restart || (await ask('Upload to BuySportCards?', true))) {
  //   await uploadToBuySportsCards(bulkGrouped);
  // }
  // if (!restart || (await ask('Upload to My Card Post?', true))) {
  //   await uploadToMyCardPost(allCards);
  // }
  if (!restart || (await ask('Upload to My Slabs?', true))) {
    await uploadToMySlabs(allCards);
  }
  // if (!restart || (await ask('Upload to Ebay?', true))) {
  //   await ebayAPIUpload(allCards);
  // }
}

export default writeOutputFiles;
