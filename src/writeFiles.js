import writeSportLotsOutput from "./listing-sites/sportlots.js";
import writeBuySportsCardsOutput from "./listing-sites/bsc.js";
import writeEbayFile from "./listing-sites/ebay.js";
import writeShopifyFile from "./listing-sites/shopify.js";
import uploadToShopify from "./listing-sites/shopifyUpload.js";

async function writeOutputFiles(allCards, bulk) {
  await uploadToShopify(allCards);
  await writeSportLotsOutput(allCards, bulk);
  await writeBuySportsCardsOutput(allCards, bulk);
  await writeEbayFile(allCards);
  await writeShopifyFile(allCards);
}

export default writeOutputFiles;
