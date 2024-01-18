import { ask } from '../utils/ask.js';
import dotenv from 'dotenv';
import { Browser, Builder, By, Key } from 'selenium-webdriver';
import { caseInsensitive, parseKey, useWaitForElement } from './uploads.js';
import chalk from 'chalk';
import { manufactures, titleCase } from '../utils/data.js';
import pRetry from 'p-retry';
import FormData from 'form-data';
import { getGroupByBin, updateGroup } from './firebase.js';
import chalkTable from 'chalk-table';
import { useSpinners } from '../utils/spinners.js';

dotenv.config();

const color = chalk.hex('#e5e5e5');
const { showSpinner, finishSpinner, errorSpinner, updateSpinner } = useSpinners('bsc', color);

const userWaitForButton = (driver) => async (text) => {
  const waitForElement = useWaitForElement(driver);
  return await waitForElement(By.xpath(`//button[descendant::text()${caseInsensitive(text.toLowerCase())}]`));
};

let _driver;

const baseHeaders = {
  accept: 'application/json, text/plain, */*',
  'accept-language': 'en-US,en;q=0.9',
  assumedrole: 'sellers',
  'content-type': 'application/json',
  origin: 'https://www.buysportscards.com',
  referer: 'https://www.buysportscards.com/',
  'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': 'macOS',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-site',
  authority: 'api-prod.buysportscards.com',
  // 'Referrer Policy:': 'strict-origin-when-cross-origin',
};

export const login = async () => {
  if (!_driver) {
    showSpinner('login', 'Logging into BSC');
    _driver = await new Builder().forBrowser(Browser.CHROME).build();
    await _driver.get('https://www.buysportscards.com');
    const waitForElement = useWaitForElement(_driver);

    const waitForButton = userWaitForButton(_driver);

    updateSpinner('login', 'Waiting for sign in button');
    const signInButton = await waitForButton('sign in');
    await signInButton.click();

    updateSpinner('login', 'Waiting for email');
    const emailInput = await waitForElement(By.id('signInName'));
    await emailInput.sendKeys(process.env.BSC_EMAIL);
    updateSpinner('login', 'Waiting for password');
    const passwordInput = await waitForElement(By.id('password'));
    await passwordInput.sendKeys(process.env.BSC_PASSWORD);

    updateSpinner('login', 'Waiting for login button');
    const nextButton = await waitForElement(By.id('next'));
    await nextButton.click();
    await waitForButton('welcome back,');

    await _driver.findElement(By.css('body')).sendKeys(Key.F12);

    updateSpinner('login', 'Getting BSC Token');
    const reduxAsString = await _driver.executeScript(
      'return Object.values(localStorage).filter((value) => value.includes("secret")).find(value=>value.includes("Bearer"));',
    );

    const redux = JSON.parse(reduxAsString);
    baseHeaders.authorization = 'Bearer ' + redux.secret.trim();

    finishSpinner('login', 'BSC Logged In');
  }

  return _driver;
};

const fetchJson = async (path, method = 'GET', body) => {
  const fetchOptions = {
    headers: baseHeaders,
    method: method,
  };

  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }
  const responseObject = await fetch(`https://api-prod.buysportscards.com/${path}`, fetchOptions);

  if (responseObject.status === 401) {
    console.log('BSC Token Expired');
    await login();
  } else if (responseObject.status < 200 || responseObject.status >= 300) {
    const err = new Error(
      `Error from ${method} https://api-prod.buysportscards.com/${path}: ${responseObject.status} ${responseObject.statusText}`,
    );

    if (body) {
      err.body = JSON.stringify(body, null, 2);
      err.bodyKeys = Object.keys(body);
    }
    if (responseObject) {
      err.response = responseObject;
    }

    throw err;
  }

  const text = await responseObject.text();

  if (text === '' || text.trim().length === 0) {
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
const put = async (path, body) => fetchJson(path, 'PUT', body);
const post = async (path, body) => fetchJson(path, 'POST', body);

async function postImage(path, imagePath) {
  const formData = new FormData();

  formData.append('attachment', fs.createReadStream(imagePath));

  const responseObject = await fetch(`https://api-prod.buysportscards.com/${path}`, {
    headers: {
      ...baseHeaders,
      ...formData.getHeaders(),
    },
    body: formData,
    method: 'POST',
  });

  if (responseObject.status < 200 || responseObject.status >= 300) {
    console.log('error', responseObject);
    throw new Error(
      `Error from POST https://api-prod.buysportscards.com/${path}: ${responseObject.status} ${responseObject.statusText}`,
    );
  }
  try {
    return await responseObject.json();
  } catch (e) {
    console.log(
      `Error from POST https://api-prod.buysportscards.com/${path}: ${responseObject.status} ${responseObject.statusText}`,
      e,
    );
    throw e;
  }
}

export async function shutdownBuySportsCards() {
  showSpinner('shutdown', 'Shutting down BSC');
  if (_driver) {
    const d = _driver;
    _driver = undefined;
    await d.quit();
  }
  finishSpinner('shutdown', 'BSC shutdown complete');
}

export async function saveBulk(listings) {
  showSpinner('saveBulk', 'Saving Bulk Upload');
  let count = 0;
  await pRetry(
    async () => {
      count++;
      if (count > 1) {
        updateSpinner('saveBulk', `Retrying Save Bulk Upload ${count} of 5`);
      }
      const results = await put('seller/bulk-upload', {
        sellerId: 'cf987f7871',
        listings,
      });
      if (results.result === 'Saved!') {
        finishSpinner('saveBulk');
      } else {
        errorSpinner('saveBulk', `Failed to save bulk upload ${results}`);
        throw new Error('Failed to remove cards');
      }
    },
    { retries: 5 },
  );
}

export async function getBuySportsCardsSales() {
  showSpinner('sales', 'Checking BSC for Sales');
  await login();
  const sales = [];
  const history = await post('seller/order/history', {
    name: '',
    orderNo: '',
    fromDate: null,
    toDate: null,
    page: 0,
    size: 5,
    status: ['READY_TO_SHIP', 'PARTIALLY_REFUNDED_READY_TO_SHIP'],
  });

  showSpinner('sales', `Found ${history.results?.length} sales on BuySportsCards`);
  for (const order of history.results) {
    updateSpinner('sales-details', 'Getting order details');
    const orderDetails = await get(`seller/order/${order.orderId}`);

    for (const item of orderDetails.orderItems) {
      updateSpinner(
        'sales-details',
        `Creating Card ${item.card.setName} ${item.card.variantName} #${item.card.cardNo} ${item.card.players}`,
      );
      const card = {
        cardNumber: item.card.cardNo,
        year: item.card.year,
        setName: item.card.setName.replace(item.card.year, '').trim(),
        sport: item.card.sport,
        player: item.card.players,
        quantity: item.orderQuantity,
        platform: `BSC: ${order.buyer.username}`,
        title: `${item.card.setName} ${item.card.variantName} #${item.card.cardNo} ${item.card.players}`,
        sku: item.sellerSku,
      };

      const manufacturer = manufactures.find((m) => card.title.toLowerCase().includes(m.toLowerCase()));
      if (manufacturer) {
        card.manufacture = manufacturer;
        card.setName = card.setName.replace(manufacturer, '').replace(titleCase(manufacturer), '').trim();
      }

      if (item.card.variant === 'Parallel') {
        card.parallel = item.card.variantName;
      } else if (item.card.variant === 'Insert') {
        card.insert = item.card.variantName;
      }
      finishSpinner('sales-details', card.title);
      sales.push(card);
    }
  }

  finishSpinner('sales', `Found ${sales.length} cards sold on BuySportsCards`);
  return sales;
}

export async function getAllListings(setData) {
  await login();
  let filters = {
    sport: [setData.sport],
    year: [setData.year],
    setName: [setData.setName],
  };
  if (setData.parallel) {
    filters.variant = ['parallel'];
    filters.variantName = [setData.parallel];
  } else if (setData.insert) {
    filters.variant = ['insert'];
    filters.variantName = [setData.insert];
  } else {
    filters.variant = ['base'];
  }

  let allPossibleListings = {};
  let body = {};

  const buildBody = (filters) => {
    body = {
      currentListings: true,
      condition: 'near_mint',
      productType: 'raw',
      filters: Object.keys(filters).reduce((result, key) => {
        result[key] = [filters[key]?.toString().toLowerCase().replaceAll(' ', '-')];
        return result;
      }, {}),
    };
    return body;
  };

  try {
    showSpinner('get-listings', `Getting listings for ${JSON.stringify(filters)}`);
    allPossibleListings = await post('seller/bulk-upload/results', buildBody(filters));

    // console.log('first listings', allPossibleListings);
    if (!allPossibleListings.results || allPossibleListings.results.length === 0) {
      errorSpinner('get-listings', `No listings found for ${JSON.stringify(filters)}`);
      throw new Error('No listings found');
    }
  } catch (e) {
    errorSpinner('get-listings', `Getting listings for ${JSON.stringify(filters)}`);
    filters = {
      sport: [setData.sport.toLowerCase()],
    };
    const getNextFilter = async (text, filterType) => {
      const filterOptions = await post('search/bulk-upload/filters', { filters });
      const response = await ask(text, undefined, {
        selectOptions: [{ name: 'None', description: 'None of the options listed are correct' }].concat(
          filterOptions.aggregations[filterType].map((variant) => ({
            name: variant.label,
            value: variant.slug,
          })),
        ),
      });
      return [response];
    };

    filters.year = await getNextFilter('Which year would you like to update?', 'year');

    filters.setName = await getNextFilter('Which set would you like to update?', 'setName');

    if (setData.insert) {
      filters.variant = ['insert'];
      filters.variantName = await getNextFilter('Which insert is this?', 'variantName');
      if (filters.variantName === 'None') {
        filters.variant = ['parallel'];
        filters.variantName = await getNextFilter('Which parallel is this?', 'variantName');
      }
    } else if (setData.parallel) {
      filters.variant = ['parallel'];
      filters.variantName = await getNextFilter('Which parallel is this?', 'variantName');
      if (filters.variantName === 'None') {
        filters.variant = ['insert'];
        filters.variantName = await getNextFilter('Which insert is this?', 'variantName');
      }
    } else {
      filters.variant = ['base'];
    }

    showSpinner('get-listings', `Getting listings for ${JSON.stringify(filters)}`);

    allPossibleListings = await post('seller/bulk-upload/results', buildBody(filters));
  }

  finishSpinner('get-listings');
  return { body, allPossibleListings };
}

export async function uploadToBuySportsCards(cardsToUpload) {
  showSpinner('upload', 'Uploading to BSC');
  await login();
  const notAdded = [];

  for (const key in cardsToUpload) {
    showSpinner(`upload-${key}`, `Uploading set ${key}`);
    const setData = await getGroupByBin(key);
    if (setData) {
      showSpinner(
        `upload-${key}`,
        `Uploading set ${setData.year} ${setData.setName} ${setData.insert || ''} ${setData.parallel || ''}`,
      );
      showSpinner(`upload-${key}-details`, 'looking for set');
      let listings = {};
      if (setData.bscFilters) {
        updateSpinner(`upload-${key}-details`, `Fetching listings for ${JSON.stringify(setData.bscFilters)}`);
        listings = (await post('seller/bulk-upload/results', setData.bscFilters)).results;
      } else {
        updateSpinner(`upload-${key}-details`, 'Searching for set for the first time');
        let { body, allPossibleListings } = await getAllListings(setData);
        listings = allPossibleListings.results;
        setData.bscFilters = body;
        await updateGroup(setData);
      }

      if (listings && listings.length > 0) {
        const updates = [];
        let updated = 0;
        showSpinner(`upload-${key}-details`, 'Adding Cards');
        await Promise.all(
          listings.map(async (listing) => {
            const card = cardsToUpload[key].find((card) => listing.card.cardNo === card.cardNumber);
            if (card) {
              showSpinner(`upload-${card.sku}`, `Uploading ${card.title}`);
              try {
                const newListing = {
                  ...listing,
                  availableQuantity: listing.availableQuantity + card.quantity,
                  price: card.bscPrice,
                  sellerSku: card.sku || card.bin,
                };
                if (card.directory) {
                  if (card.frontImage) {
                    updateSpinner(`upload-${card.sku}`, `Uploading ${card.title} (Front Image)`);
                    newListing.sellerImgFront = (
                      await postImage(
                        'common/card/undefined/product/undefined/attachment',
                        `output/${card.directory}${card.frontImage}`,
                      )
                    ).objectKey;
                    newListing.imageChanged = true;
                  }
                  if (card.backImage) {
                    updateSpinner(`upload-${card.sku}`, `Uploading ${card.title} (Back Image)`);
                    newListing.sellerImgBack = (
                      await postImage(
                        'common/card/undefined/product/undefined/attachment',
                        `output/${card.directory}${card.backImage}`,
                      )
                    ).objectKey;
                    newListing.imageChanged = true;
                  }
                }
                finishSpinner(`upload-${card.sku}`, `Added ${card.title}`);
                updates.push(newListing);
                updated++;
              } catch (e) {
                errorSpinner(`upload-${card.sku}`, `Error adding ${card.title}: ${e.message}`);
              }
            } else if (listing.availableQuantity > 0) {
              updates.push(listing);
            }
          }),
        );

        if (updated > 0) {
          showSpinner(`upload-${key}-details`, 'Uploading Results');
          if (updated < cardsToUpload[key].length) {
            const nonUpdated = cardsToUpload[key].filter(
              (card) => !updates.find((listing) => listing.card.cardNo === card.cardNumber),
            );
            nonUpdated.forEach((card) => errorSpinner(`upload-${card.sku}`, `Failed to add ${card.title}`));
            notAdded.push(...nonUpdated);
          }
          try {
            await saveBulk(updates);
            finishSpinner(`upload-${key}-details`, `Added ${updates.length} cards to ${key}`);
          } catch (e) {
            errorSpinner(`upload-${key}-details`, `Failed to add cards to ${key}: ${e.message}`);
            notAdded.push(...cardsToUpload[key]);
          }
        }
      } else {
        errorSpinner(`upload-${key}-details`, `Could not find set ${key}`);
        notAdded.push(...cardsToUpload[key]);
      }
    } else {
      errorSpinner(`upload-${key}-details`, `Could not find set data for ${key}`);
      notAdded.push(...cardsToUpload[key]);
    }

    finishSpinner(`upload-${key}`);
  }

  if (notAdded.length > 0) {
    errorSpinner('upload', 'Failed to add all cards to BSC');
  } else {
    finishSpinner('upload', 'All cards added to BSC');
  }
}

const findListing = async (listings, card) => {
  showSpinner('find-listing', `Finding listing for ${card.title}`);
  let found = false;

  //look for exact card number match
  let listing = listings.find((listing) => listing.card.cardNo === card.cardNumber);
  if (listing) {
    finishSpinner('find-listing');
    return listing;
  }

  errorSpinner('find-listing', `No Exact match for ${card.title}`);

  //look for fuzzy card number match
  if (!found) {
    listing = listings.find(
      (listing) => listing.card.cardNo.replaceAll(/\D/g, '') === card.cardNumber.replaceAll(/\D/g, ''),
    );
    if (listing) {
      found = await ask(`Is this a match? ${listing.card.cardNo} ${listing.card.players}`, true);
    }
  }

  //look for player name match
  if (!found && card.player) {
    const names = card.player.toLowerCase().split(/\s+/);
    listing = listings.find((listing) => names.every((name) => listing.card.players.toLowerCase().includes(name)));
    if (listing) {
      found = await ask(`Is this a match? ${listing.card.cardNo} ${listing.card.players}`, true);
    }
  }

  //just throw all the cards in a list
  if (!found) {
    const selectOptions = [
      { name: 'None', value: null },
      ...listings.map((listing) => ({
        name: `${listing.card.cardNo} ${listing.card.players}`,
        value: listing,
      })),
    ];
    const answer = await ask(`Which listing is this? ${chalk.yellow(card.title)}`, undefined, { selectOptions });
    if (answer) {
      listing = answer;
      found = true;
    }
  }

  return found ? listing : undefined;
};

export async function removeWithAPI(cardsToRemove) {
  showSpinner('remove-details', 'Login');
  await login();
  const notRemoved = [];
  showSpinner('remove-details', `Removing ${Object.keys(cardsToRemove).length} sets`);
  for (const key in cardsToRemove) {
    try {
      showSpinner(`remove-key-${key}`, `Removing ${key}`);
      showSpinner(`remove-key-${key}-details`, `Removing ${key}`);
      const setData = await parseKey(key, true);

      let listings;
      if (setData.bscFilters) {
        updateSpinner(`remove-key-${key}-details`, `Getting exact results `);
        listings = (await post('seller/bulk-upload/results', setData.bscFilters)).results;
      } else {
        updateSpinner(`remove-key-${key}-details`, `Searching for listings`);
        let { body, allPossibleListings } = await getAllListings(setData);
        listings = allPossibleListings.results;
        if (listings?.length === 0) {
          setData.bscFilters = body;
          await updateGroup(setData);
        }
      }

      if (listings && listings.length > 0) {
        let updated = 0;
        updateSpinner(`remove-key-${key}-details`, `Searching for listings`);
        for (const card of cardsToRemove[key]) {
          showSpinner(`remove-card-${card.title}`, `Removing ${card.title}`);
          const listing = await findListing(listings, card);
          if (listing) {
            let newQuantity = listing.availableQuantity + card.quantity;
            if (newQuantity < 0) {
              newQuantity = 0;
            }
            listing.availableQuantity = newQuantity;
            updated++;
            finishSpinner(`remove-card-${card.title}`, `Setting quantity of ${card.title} to ${newQuantity}`);
          } else {
            card.error = 'No match in set';
            notRemoved.push(card);
            errorSpinner(`remove-card-${card.title}`, `No match for ${card.title}`);
          }
        }

        if (updated > 0) {
          try {
            updateSpinner(`remove-key-${key}-details`, `Saving updates`);
            await saveBulk(listings);
            finishSpinner(`remove-key-${key}-details`);
            finishSpinner(`remove-key-${key}`);
          } catch (e) {
            notRemoved.push(...cardsToRemove[key].map((card) => ({ ...card, error: e.message })));
            finishSpinner(`remove-key-${key}-details`);
            errorSpinner(`remove-key-${key}`, `Failed to remove cards for set ${key}`);
          }
        }
      } else {
        notRemoved.push(...cardsToRemove[key].map((card) => ({ ...card, error: 'No Set Found' })));
        finishSpinner(`remove-key-${key}-details`);
        errorSpinner(`remove-key-${key}`, `Could not find any listings for ${key}`);
      }
    } finally {
      //These should both be closed out before this, but if something went off the rails just close them out to be safe
      finishSpinner(`remove-key-${key}`);
      finishSpinner(`remove-key-${key}-details`);
    }
  }

  if (notRemoved.length > 0) {
    errorSpinner('remove-details', 'Failed to remove all cards from BuySportsCards');
    console.log(
      chalkTable(
        {
          leftPad: 2,
          columns: [
            { field: 'title', name: 'Title' },
            { field: 'quantity', name: 'Quantity' },
            { field: 'error', name: 'Error' },
          ],
        },
        notRemoved,
      ),
    );
  } else {
    finishSpinner('remove-details');
  }
}

export async function removeFromBuySportsCards(cardsToRemove) {
  showSpinner('remove', 'BSC Starting Removal');
  await removeWithAPI(
    Object.keys(cardsToRemove).reduce((result, key) => {
      const group = cardsToRemove[key]
        .filter((card) => card.platform.indexOf('BSC:') === -1)
        .map((card) => ({
          ...card,
          quantity: -Math.abs(card.quantity),
        }));
      if (group.length > 0) {
        result[key] = group;
      }
      return result;
    }, {}),
  );
  finishSpinner('remove', 'BSC Removal Complete');
}
