import { initializeAnswers } from './card-data/cardData.js';
import 'zx/globals';
import dotenv from 'dotenv';
import { getInputs } from './utils/inputs.js';
import uploadToShopify from './listing-sites/shopifyUpload.js';
import writeSportLotsOutput from './listing-sites/sportlots.js';
import { uploadToBuySportsCards } from './listing-sites/bsc.js';
import writeEbayFile, { ebayAPIUpload } from './listing-sites/ebay.js';
import { ask } from './utils/ask.js';
import { createGroups } from './listing-sites/uploads.js';
import { uploadToMyCardPost } from './listing-sites/mycardpost.js';

dotenv.config();

const inputDirectory = await getInputs();
const savedAnswers = await initializeAnswers(inputDirectory, true);

// await loginTest();

const bulkGrouped = createGroups(savedAnswers.allCardData, savedAnswers.bulk);

// if (await ask('Upload to Shopify?', true)) {
//   await uploadToShopify(savedAnswers.allCardData);
// }
// if (await ask('Write to Sportlots?', true)) {
//   await writeSportLotsOutput(bulkGrouped);
// }
// if (await ask('Write to BuySportsCards?', true)) {
//   await uploadToBuySportsCards(bulkGrouped);
// }
// if (await ask('Write to My Card Post?', true)) {
//   await uploadToMyCardPost(savedAnswers.allCardData);
// }
// if (await ask('Write to eBay?', true)) {
await ebayAPIUpload(savedAnswers.allCardData);
// }
