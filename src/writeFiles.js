import writeSportLotsOutput from "./listing-sites/sportlots.js";
import writeBuySportsCardsOutput from "./listing-sites/bsc.js";
import writeEbayFile from "./listing-sites/ebay.js";
import writeShopifyFile from "./listing-sites/shopify.js";
import uploadToShopify from "./listing-sites/shopifyUpload.js";
import uploaddToEbay from "./listing-sites/ebayUpload.js";

async function writeOutputFiles(allCards) {
  await Promise.all([
    uploadToShopify(allCards),
    // writeSportLotsOutput(allCards),
    // writeBuySportsCardsOutput(allCards),
    // writeEbayFile(allCards),
    // writeShopifyFile(allCards),
    // uploaddToEbay(allCards)
  ]);
}

export default writeOutputFiles;
