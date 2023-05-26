import writeSportLotsOutput from "./listing-sites/sportlots.js";
import writeBuySportsCardsOutput from "./listing-sites/bsc.js";
import writeEbayFile from "./listing-sites/ebay.js";
import writeShopifyFile from "./listing-sites/shopify.js";

async function writeOutputFiles(allCards) {
  await writeSportLotsOutput(allCards);
  await writeBuySportsCardsOutput(allCards);
  await writeEbayFile(allCards);
  await writeShopifyFile(allCards);
}

export default writeOutputFiles;
