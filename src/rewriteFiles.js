import { initializeAnswers } from "./card-data/cardData.js";
import "zx/globals";
import dotenv from "dotenv";
import { getInputDirectory, getInputs } from "./utils/inputs.js";
import uploadToShopify from "./listing-sites/shopifyUpload.js";
import writeSportLotsOutput from "./listing-sites/sportlots.js";
import writeBuySportsCardsOutput, { loginTest } from "./listing-sites/bsc.js";
import writeEbayFile from "./listing-sites/ebay.js";
import writeShopifyFile from "./listing-sites/shopify.js";
import { ask } from "./utils/ask.js";

dotenv.config();

const inputDirectory = await getInputs();
const savedAnswers = await initializeAnswers(inputDirectory, true);

await loginTest();
if (await ask("Upload to Shopify?", true)) {
  await uploadToShopify(savedAnswers.allCardData);
}
if (await ask("Write to Sportlots?", true)) {
  await writeSportLotsOutput(savedAnswers.allCardData, savedAnswers.bulk);
}
if (await ask("Write to BuySportsCards?", true)) {
  await writeBuySportsCardsOutput(savedAnswers.allCardData, savedAnswers.bulk);
}
if (await ask("Write to eBay?", true)) {
  await writeEbayFile(savedAnswers.allCardData);
}

Object.values(savedAnswers.allCardData).forEach((t) => console.log(t.title));
