import { initializeAnswers } from "./card-data/cardData.js";
import "zx/globals";
import dotenv from "dotenv";
import { getInputDirectory } from "./utils/inputs.js";
import uploadToShopify from "./listing-sites/shopifyUpload.js";
import writeSportLotsOutput from "./listing-sites/sportlots.js";
import writeBuySportsCardsOutput from "./listing-sites/bsc.js";
import writeEbayFile from "./listing-sites/ebay.js";
import writeShopifyFile from "./listing-sites/shopify.js";

dotenv.config();

const inputDirectory = await getInputDirectory();
const savedAnswers = await initializeAnswers(inputDirectory, true);
await Promise.all([
  // uploadToShopify(savedAnswers.allCardData),
  // writeSportLotsOutput(savedAnswers.allCardData),
  // writeBuySportsCardsOutput(savedAnswers.allCardData),
  writeEbayFile(savedAnswers.allCardData),
  // writeShopifyFile(savedAnswers.allCardData),
]);
Object.values(savedAnswers.allCardData).forEach((t) => console.log(t.title));
