import writeSportLotsOutput from "./listing-sites/sportlots.js";
import writeBuySportsCardsOutput from "./listing-sites/bsc.js";
import writeEbayFile from "./listing-sites/ebay.js";
import writeShopifyFile from "./listing-sites/shopify.js";
import uploadToShopify from "./listing-sites/shopifyUpload.js";

async function writeOutputFiles(allCards) {
  await Promise.all([
    uploadToShopify(allCards),
    writeSportLotsOutput(allCards),
    writeBuySportsCardsOutput(allCards),
    writeEbayFile(allCards),
    writeShopifyFile(allCards),
  ]);
}

export default writeOutputFiles;
