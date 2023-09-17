import { byCardNumber } from "../utils/data.js";
import open from "open";
import url from "url";
import FormData from "form-data";
import Queue from "queue";
// set up the queues

$.verbose = false;

const uploadQueue = new Queue({
  results: [],
  autostart: true,
  concurrency: 5,
});

async function writeBuySportsCardsOutput(allCards, bulk) {
  const years = {};

  //queue up all the cards for writing in real time
  const queueCards = (arrayOfCards) =>
    arrayOfCards.forEach((card) => {
      uploadQueue.push(async () => writeToAPI(card));
    });
  queueCards(Object.values(allCards));
  queueCards(bulk);

  // uploadQueue.push(async () => writeToAPI(allCards["165"]));

  //group cards
  Object.values(allCards).forEach((card) => {
    if (!years[card.year]) {
      years[card.year] = {};
    }
    let setName = card.setName;
    const addToSetName = (modifier) => {
      if (modifier) {
        setName = `${setName} ${modifier}`;
      }
    };
    addToSetName(card.parallel);
    if (card.insert !== "Base Set") addToSetName(card.insert);
    if (!years[card.year][setName]) {
      years[card.year][setName] = [];
    }
    years[card.year][setName].push(card);
  });

  //sort all cards in year by cardNumber
  Object.keys(years).forEach((year) => {
    Object.keys(years[year]).forEach((setName) => {
      years[year][setName].sort((a, b) => parseInt(a.cardNumber) - parseInt(b.cardNumber));
    });
  });

  //write output sorted by year and then setName
  const output = [];
  Object.keys(years)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .forEach((year) => {
      output.push(""); //add blank line between years
      output.push(year);
      Object.keys(years[year])
        .sort()
        .forEach((setName) => {
          years[year][setName].sort(byCardNumber).forEach((card) => {
            output.push(
              `    ${card.year} ${setName} ${card.cardNumber} ${card.player} ${card.bscPrice} (${card.quantity})`,
            );
          });
        });
    });
  output.push("");
  try {
    await fs.outputFile("output/bsc.txt", output.join("\n"));
  } catch (err) {
    console.error("Failed to write bsc.txt");
    console.error(err);
    throw err;
  }

  await new Promise((resolve) => uploadQueue.addEventListener("end", resolve));
}

const baseHeaders = () => ({
  accept: "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  assumedrole: "sellers",
  authorization: "Bearer " + process.env.BSC_TOKEN,
  "content-type": "application/json",
});

async function post(path, body) {
  const responseObject = await fetch(`https://api-prod.buysportscards.com/${path}`, {
    headers: baseHeaders(),
    body: JSON.stringify(body),
    method: "POST",
  });

  return responseObject.json();
}

async function postImage(path, imagePath) {
  const formData = new FormData();

  formData.append("attachment", fs.createReadStream(imagePath));

  const responseObject = await fetch(`https://api-prod.buysportscards.com/${path}`, {
    headers: {
      ...baseHeaders(),
      ...formData.getHeaders(),
    },
    body: formData,
    method: "POST",
  });

  return responseObject.json();
}

async function put(path, body) {
  const responseObject = await fetch(`https://api-prod.buysportscards.com/${path}`, {
    headers: baseHeaders(),
    body: JSON.stringify(body),
    method: "PUT",
  });

  return responseObject.json();
}

const get = async (path) =>
  (
    await fetch(`https://api-prod.buysportscards.com/${path}`, {
      headers: baseHeaders(),
      method: "GET",
    })
  ).json();

async function writeToAPI(card) {
  const searchPath = `search/seller/results?q=${card.setName}+${card.player}`.replaceAll("& ", "").replaceAll(" ", "+");
  // console.log(`Searching for: ${searchPath}`);
  const filters = {
    cardNo: [card.cardNumber],
    sport: [card.sport.toLowerCase()],
    variant: [],
    variantName: [],
    year: [card.year],
  };

  if (card.insert) {
    filters.variant.push("insert");
    if (card.parallel) {
      filters.variantName.push(
        `${card.insert}-${card.parallel}`.toLowerCase().replaceAll("&", "and").replaceAll(" ", "-"),
      );
    } else {
      filters.variantName.push(card.insert.toLowerCase().replaceAll("&", "and").replaceAll(" ", "-"));
    }
  } else if (card.parallel) {
    filters.variant.push("parallel");
    filters.variantName.push(card.parallel.toLowerCase().replaceAll("&", "and").replaceAll(" ", "-"));
  } else {
    filters.variant.push("base");
  }

  const listResponse = await post(searchPath, {
    condition: "all",
    filters: filters,
    myInventory: "false",
    page: 0,
    sellerId: "cf987f7871",
    size: 2,
    sort: "default",
  });

  // console.log(JSON.stringify(listResponse, null, 2));

  if (listResponse.totalResults === 1) {
    //should probably only proceed if there is a single listing returned rather than assuming the first is correct
    const listingId = listResponse.results[0].id;

    // console.log("First Result = " + listingId);

    const settingsResponse = await get(`seller/card-listing/${listingId}/settings`);

    const listing = {
      productType: "raw",
      condition: "near_mint",
      grade: "",
      price: card.bscPrice,
      quantity: card.quantity,
      gradingCompany: "",
      productId: settingsResponse.productId,
      sportId: card.sport,
      availableQuantity: card.quantity,
    };

    if (card.frontImage) {
      const frontResponse = await postImage(
        `common/card/${listingId}/product/e484609d38/attachment`,
        `output/${card.directory}${card.frontImage}`,
      );
      listing.sellerImgFront = frontResponse.objectKey;
    }

    if (card.backImage) {
      const backResponse = await postImage(
        `common/card/${listingId}/product/e484609d38/attachment`,
        `output/${card.directory}${card.backImage}`,
      );
      listing.sellerImgBack = backResponse.objectKey;
    }

    const saveResponse = await put(`seller/card-listing/${listingId}/product`, { action: "add", listing });

    // console.log("saveResponse Result = " + JSON.stringify(saveResponse, null, 2));
    if (saveResponse.listings?.length > 0) {
      console.log(`Successfully uploaded ${card.longTitle || card.cardNumber} to BSC`);
    } else {
      await open(
        `https://www.buysportscards.com/sellers/inventory?myInventory=false&p=0&q=${encodeURI(
          card.cardName.replaceAll("&", ""),
        )}`,
      );
    }
  } else {
    console.log(`Found ${listResponse.totalResults} results for ${card.cardName}`);
    console.log("  " + searchPath);
    console.log("  " + JSON.stringify(filters));
    console.log("  " + "Opening BSC now");
    await open(
      `https://www.buysportscards.com/sellers/inventory?myInventory=false&p=0&q=${encodeURI(
        card.cardName.replaceAll("&", ""),
      )}`,
    );
  }
}

export default writeBuySportsCardsOutput;
