import { initializeAnswers } from "./card-data/cardData.js";
import "zx/globals";
import dotenv from "dotenv";
import { getInputDirectory, getInputs } from "./utils/inputs.js";
import uploadToShopify from "./listing-sites/shopifyUpload.js";
import writeSportLotsOutput from "./listing-sites/sportlots.js";
import writeBuySportsCardsOutput from "./listing-sites/bsc.js";
import writeEbayFile from "./listing-sites/ebay.js";
import writeShopifyFile from "./listing-sites/shopify.js";

dotenv.config();

const inputDirectory = await getInputs();
const savedAnswers = await initializeAnswers(inputDirectory, true);

await uploadToShopify(savedAnswers.allCardData);
await writeSportLotsOutput(savedAnswers.allCardData, savedAnswers.bulk);
await writeBuySportsCardsOutput(savedAnswers.allCardData, savedAnswers.bulk);
await writeEbayFile(savedAnswers.allCardData);
await writeShopifyFile(writeShopifyFilesavedAnswers.allCardData);

Object.values(savedAnswers.allCardData).forEach((t) => console.log(t.title));
