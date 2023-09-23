import { byCardNumber } from "../utils/data.js";
import open from "open";
import FormData from "form-data";
import Queue from "queue";
// set up the queues

$.verbose = false;

const results = [];
const uploadQueue = new Queue({
  results: results,
  autostart: true,
  concurrency: 5,
});

async function writeBuySportsCardsOutput(allCards, bulk = []) {
  await loginTest();

  const years = {};
  let hasQueueError = false;
  uploadQueue.addEventListener("error", (error, job) => {
    hasQueueError = true;
    console.log(`Queue error: `, error, job);
    uploadQueue.stop();
  });

  // queue up all the cards for writing in real time

  Object.values(allCards).forEach((card) => {
    uploadQueue.push(async () => await writeToAPI(card));
  });

  //now group up the bulk uploads
  Object.entries(
    bulk.reduce((cardsToUpload, card) => {
      const key = JSON.stringify({
        year: card.year,
        sport: card.sport.toLowerCase(),
        brand: card.manufacture.toLowerCase(),
        setName: card.setName.toLowerCase(),
        parallel: card.parallel.toLowerCase(),
        insert: card.insert.toLowerCase(),
      });
      if (!cardsToUpload[key]) {
        cardsToUpload[key] = {};
      }
      cardsToUpload[key][card.cardNumber] = card;
      //also add to cardsToUpLoad removing all non-numeric characters from cardNumber
      const cardNumber = card.cardNumber.toString().replace(/\D/g, "");
      if (cardNumber) {
        cardsToUpload[key][cardNumber] = card;
      }
      return cardsToUpload;
    }, {}),
  ).forEach(([key, cards]) => {
    // console.log(`Adding cards to bulk upload for ${JSON.stringify(key)}`);
    uploadQueue.push(async () => await writeBulkToAPI(key, cards));
  });

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

  if (!hasQueueError) {
    console.log("wait for the queues!");
    await new Promise((resolve) =>
      uploadQueue.addEventListener("end", () => {
        resolve();
      }),
    );
    // console.log("results", results);
    console.log(
      "Finished uploading to BSC. ",
      results.reduce((sum, currentValue) => sum + Number.parseInt(currentValue), 0),
      " cards uploaded.",
    );
  } else {
    console.log("Queue error. ", results.length, " cards uploaded.");
  }
}

const baseHeaders = () => ({
  accept: "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  assumedrole: "sellers",
  authorization: "Bearer " + process.env.BSC_TOKEN,
  "content-type": "application/json",
});

const fetchJson = async (path, method = "GET", body) => {
  const fetchOptions = {
    headers: baseHeaders(),
    method: method,
  };

  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }
  const responseObject = await fetch(`https://api-prod.buysportscards.com/${path}`, fetchOptions);

  if (responseObject.status === 401) {
    console.log("BSC Token Expired");
    process.exit(1);
  } else if (responseObject.status < 200 || responseObject.status >= 300) {
    console.group(`Error from BSC ${method} ${path}`);
    if (body) console.log("Body: ", JSON.stringify(body, null, 2));
    if (responseObject) console.log("Response: ", JSON.stringify(responseObject, null, 2));
    console.groupEnd();
    throw new Error(
      `Error from PUT https://api-prod.buysportscards.com/${path}: ${responseObject.status} ${responseObject.statusText}`,
    );
  }

  const text = await responseObject.text();

  if (text === "" || text.trim().length === 0) {
    console.group("Empty response from BSC");
    if (body) {
      console.log(JSON.stringify(body, null, 2));
    }
    console.log("path: ", `https://api-prod.buysportscards.com/${path}`);
    console.groupEnd();
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.log(`Error parsing JSON response from PUT ${path}`, text);
    console.log(e);
    throw e;
  }
};

const get = fetchJson;
const put = async (path, body) => fetchJson(path, "PUT", body);
const post = async (path, body) => fetchJson(path, "POST", body);

async function postImage(path, imagePath) {
  const formData = new FormData();

  formData.append("attachment", fs.createReadStream(imagePath));

  return post(path, formData);
}

const getVariantsForFilters = (info) => {
  const filters = {
    variant: [],
    variantName: [],
  };
  if (info.insert) {
    filters.variant.push("insert");
    if (info.parallel) {
      filters.variantName.push(
        `${info.insert}-${info.parallel}`.toLowerCase().replaceAll("&", "and").replaceAll(" ", "-"),
      );
    } else {
      filters.variantName.push(info.insert.toLowerCase().replaceAll("&", "and").replaceAll(" ", "-"));
    }
  } else if (info.parallel) {
    filters.variant.push("parallel");
    filters.variantName.push(info.parallel.toLowerCase().replaceAll("&", "and").replaceAll(" ", "-"));
  } else {
    filters.variant.push("base");
  }
  return filters;
};

export async function loginTest() {
  const loginResponse = await get("seller/dashboard/information");
  if (loginResponse && loginResponse.profile.sellerStoreName === "edvedafi") {
    console.log("Successfully logged into BSC");
  } else {
    console.log("Failed to log into BSC");
    console.log(loginResponse);
    throw new Error("Failed to log into BSC");
  }
}

async function writeToAPI(card) {
  // console.log(`Processing ${card.longTitle || card.cardNumber}`);
  const searchPath = `search/seller/results?q=${card.setName}+${card.player}`.replaceAll("& ", "").replaceAll(" ", "+");
  // console.log(`Searching for: ${searchPath}`);
  const filters = {
    cardNo: [card.cardNumber],
    sport: [card.sport.toLowerCase()],
    year: [card.year],
    ...getVariantsForFilters(card),
  };

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

    // console.log("settingsResponse Result = " + JSON.stringify(settingsResponse, null, 2));

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
      listing.sellerImgFront = frontResponse?.objectKey;
    }

    if (card.backImage) {
      const backResponse = await postImage(
        `common/card/${listingId}/product/e484609d38/attachment`,
        `output/${card.directory}${card.backImage}`,
      );
      listing.sellerImgBack = backResponse?.objectKey;
    }

    const saveResponse = await put(`seller/card-listing/${listingId}/product`, { action: "add", listing });

    // console.log("saveResponse Result = " + JSON.stringify(saveResponse, null, 2));
    if (saveResponse.listings?.length > 0) {
      // console.log(`Successfully uploaded ${card.longTitle || card.cardNumber} to BSC`);
      return 1;
    } else {
      // console.log(`Failed to upload ${card.longTitle || card.cardNumber} to BSC`);
      await open(
        `https://www.buysportscards.com/sellers/inventory?myInventory=false&p=0&q=${encodeURI(
          card.cardName.replaceAll("&", ""),
        )}`,
      );
      return 0;
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

async function writeBulkToAPI(keyString, cards) {
  try {
    const key = JSON.parse(keyString);
    const searchBody = {
      filters: {
        sport: [key.sport],
        year: [key.year],
        setName: [key.setName.replaceAll(" ", "-")],
        ...getVariantsForFilters(key),
      },
      condition: "near_mint",
      productType: "raw",
      currentListings: true,
    };

    let listResponse = await post("seller/bulk-upload/results", searchBody);
    if (!listResponse || listResponse.totalResults < 1) {
      searchBody.filters.setName = [`${key.brand}-${key.setName}`.replaceAll(" ", "-")];
      listResponse = await post("seller/bulk-upload/results", searchBody);
      if (!listResponse || listResponse.totalResults < 1) {
        console.log("Failed to find bulk upload for: ", key);
        throw new Error("Failed to find bulk upload for: ", key);
      }
    }

    const updates = [];
    listResponse.results.forEach((listing) => {
      const card = cards[listing.card.cardNo];
      if (card) {
        updates.push({
          ...listing,
          price: `${card.bscPrice}`,
          availableQuantity: `${card.quantity}`,
        });
      } else if (listing.availableQuantity > 0) {
        updates.push(listing);
      }
    });

    const updateResponse = await put("seller/bulk-upload", {
      sellerId: "cf987f7871",
      listings: updates,
    });

    if (updateResponse.result === "Saved!") {
      return updateResponse.listings?.length;
    } else {
      console.log(updates);
      console.log("Failed to update bulk upload for: ", keyString);
      console.log(updateResponse);
      throw new Error("Failed to update bulk upload for: ", keyString);
    }
  } catch (err) {
    console.log("Error in bulk upload: ", err);
    throw err;
  }
}

export default writeBuySportsCardsOutput;
