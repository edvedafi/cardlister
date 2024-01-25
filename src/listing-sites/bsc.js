import { ask } from '../utils/ask.js';
import dotenv from 'dotenv';
import { Browser, Builder, By, Key } from 'selenium-webdriver';
import { caseInsensitive, parseKey, useWaitForElement } from './uploads.js';
import chalk from 'chalk';
import { manufactures, titleCase } from '../utils/data.js';
import pRetry from 'p-retry';
import FormData from 'form-data';
import { getGroupByBin, updateGroup } from './firebase.js';
import { useSpinners } from '../utils/spinners.js';
import axios from 'axios';

dotenv.config();

const color = chalk.hex('#e5e5e5');
const { showSpinner, log } = useSpinners('bsc', color);

const userWaitForButton = (driver) => async (text) => {
  const waitForElement = useWaitForElement(driver);
  return await waitForElement(By.xpath(`//button[descendant::text()${caseInsensitive(text.toLowerCase())}]`));
};

let _driver;
let _api;

const baseHeaders = {
  //REMOVE
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
  if (!_api) {
    const { update, finish } = showSpinner('login', 'Logging into BSC');
    _driver = await new Builder().forBrowser(Browser.CHROME).build();
    await _driver.get('https://www.buysportscards.com');
    const waitForElement = useWaitForElement(_driver);

    const waitForButton = userWaitForButton(_driver);

    update('sign in button');
    const signInButton = await waitForButton('sign in');
    await signInButton.click();

    update('email');
    const emailInput = await waitForElement(By.id('signInName'));
    await emailInput.sendKeys(process.env.BSC_EMAIL);
    update('password');
    const passwordInput = await waitForElement(By.id('password'));
    await passwordInput.sendKeys(process.env.BSC_PASSWORD);

    update('submitting');
    const nextButton = await waitForElement(By.id('next'));
    await nextButton.click();
    await waitForButton('welcome back,');

    update('devtools');
    await _driver.findElement(By.css('body')).sendKeys(Key.F12);

    update('Getting BSC Token');
    const reduxAsString = await _driver.executeScript(
      'return Object.values(localStorage).filter((value) => value.includes("secret")).find(value=>value.includes("Bearer"));',
    );

    update('Saving  Token');
    const redux = JSON.parse(reduxAsString);

    baseHeaders.authorization = 'Bearer ' + redux.secret.trim(); //REMOVE

    _api = axios.create({
      baseURL: 'https://api-prod.buysportscards.com/',
      headers: {
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
        authorization: `Bearer ${redux.secret.trim()}`,
      },
    });

    finish('Logged into BSC');
  }

  return _api;
};
//
// //REMOVE ALL OF THESE
// const fetchJson = async (path, method = 'GET', body) => {
//   const fetchOptions = {
//     headers: baseHeaders,
//     method: method,
//   };
//
//   if (body) {
//     fetchOptions.body = JSON.stringify(body);
//   }
//   const responseObject = await fetch(`https://api-prod.buysportscards.com/${path}`, fetchOptions);
//
//   if (responseObject.status === 401) {
//     console.log('BSC Token Expired');
//     await login();
//   } else if (responseObject.status < 200 || responseObject.status >= 300) {
//     const err = new Error(
//       `Error from ${method} https://api-prod.buysportscards.com/${path}: ${responseObject.status} ${responseObject.statusText}`,
//     );
//
//     if (body) {
//       err.body = JSON.stringify(body, null, 2);
//       err.bodyKeys = Object.keys(body);
//     }
//     if (responseObject) {
//       err.response = responseObject;
//     }
//
//     throw err;
//   }
//
//   const text = await responseObject.text();
//
//   if (text === '' || text.trim().length === 0) {
//     return undefined;
//   }
//
//   try {
//     return JSON.parse(text);
//   } catch (e) {
//     console.log(`Error parsing JSON response from PUT ${path}`, text);
//     console.log(e);
//     throw e;
//   }
// };
//
// const get = fetchJson;
// const put = async (path, body) => fetchJson(path, 'PUT', body);
// const post = async (path, body) => fetchJson(path, 'POST', body);

async function postImage(path, imagePath) {
  const { finish, error } = showSpinner('post-image', `Uploading ${imagePath}`);
  const api = await login();

  const formData = new FormData();

  formData.append('attachment', fs.createReadStream(imagePath));
  try {
    const response = await api.post(`https://api-prod.buysportscards.com/${path}`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    finish();
    return response.data;
  } catch (e) {
    error(e);
    throw e;
  }
}

export async function shutdownBuySportsCards() {
  const { finish } = showSpinner('shutdown', 'Shutting down BSC');
  if (_driver) {
    const d = _driver;
    _driver = undefined;
    await d.quit();
  }
  finish('BSC shutdown complete');
}

export async function saveBulk(listings) {
  const { update, finish, error } = showSpinner('saveBulk', 'Saving Bulk Upload');
  let count = 0;
  let api = await login();
  await pRetry(
    async () => {
      count++;
      if (count > 1) {
        update(`${count} of 5`);
      }
      const { data: results } = await api.put('seller/bulk-upload', {
        sellerId: 'cf987f7871',
        listings,
      });
      if (results.result === 'Saved!') {
        finish();
      } else {
        throw new Error(results);
      }
    },
    { retries: 5 },
  ).catch((e) => {
    error(e);
    throw e;
  });
}

export async function getBuySportsCardsSales() {
  const { error } = showSpinner('sales', 'Checking BSC for Sales');
  const sales = [];
  try {
    const api = await login();
    const historyResponse = await api.post('seller/order/history', {
      name: '',
      orderNo: '',
      fromDate: null,
      toDate: null,
      page: 0,
      size: 5,
      status: ['READY_TO_SHIP', 'PARTIALLY_REFUNDED_READY_TO_SHIP'],
    });
    const history = historyResponse.data.results || [];

    const { update: updateOuter, finish: finishOuter } = showSpinner('sales', `Found ${history.length} sales`);
    for (const order of history) {
      updateOuter(`Order ${order.orderId}`);
      const orderDetailsResponse = await api.get(`seller/order/${order.orderId}`);
      const orderItems = orderDetailsResponse.data.orderItems || [];

      for (const item of orderItems) {
        const { finish } = showSpinner(
          item.sellerSku,
          `Creating ${item.card.setName} ${item.card.variantName} #${item.card.cardNo} ${item.card.players}`,
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
        sales.push(card);
        finish(card.title);
      }
    }

    finishOuter(`Found ${sales.length} cards sold on BuySportsCards`);
  } catch (e) {
    error(e);
    throw e;
  }
  return sales;
}

const buildBody = (filters) => ({
  currentListings: true,
  condition: 'near_mint',
  productType: 'raw',
  filters: Object.keys(filters).reduce((result, key) => {
    result[key] = [filters[key]?.toString().toLowerCase().replaceAll(' ', '-')];
    return result;
  }, {}),
});

export async function getAllListings(setData) {
  const { update, finish, error } = showSpinner('get-listings', `Getting listings`);
  const api = await login();
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
  try {
    update(JSON.stringify(filters));
    const { data: allPossibleListings } = await api.post('seller/bulk-upload/results', buildBody(filters));

    if (!allPossibleListings.results || allPossibleListings.results.length === 0) {
      throw new Error(`No listings found for ${JSON.stringify(filters)}`);
    }
  } catch (e) {
    log(e);
    filters = {
      sport: [setData.sport.toLowerCase()],
    };
    const getNextFilter = async (text, filterType) => {
      const filterOptions = await api.post('search/bulk-upload/filters', { filters });
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

    update(JSON.stringify(filters));

    try {
      const response = await api.post('seller/bulk-upload/results', buildBody(filters));
      allPossibleListings = response.data;
    } catch (e) {
      error(e);
      throw e;
    }
  }

  finish();
  return { body: buildBody(filters), allPossibleListings };
}

export async function findSetInfo(defaultValues) {
  const setData = { ...defaultValues };
  const { update, finish, error } = showSpinner('findSetInfo', `Finding set info for ${JSON.stringify(setData)}`);
  const api = await login();
  update('login');
  await login();
  update('default filters');
  let filters = {};

  try {
    const getNextFilter = async (text, filterType, defaultValue) => {
      const { data: filterOptions } = await api.post('search/bulk-upload/filters', { filters });
      const response = await ask(text, defaultValue, {
        selectOptions: [{ name: 'None', description: 'None of the options listed are correct' }].concat(
          filterOptions.aggregations[filterType].map((variant) => ({
            name: variant.label,
            value: variant.slug,
          })),
        ),
      });
      filters[filterType] = [response];
      return response;
    };

    setData.sport = await getNextFilter('Sport?', 'sport', setData.sport);
    setData.year = await getNextFilter('Year?', 'year', setData.year);
    if (!setData.manufacture) {
      setData.manufacture = await ask('Manufacturer?');
    }
    const setName = await getNextFilter('Set Name?', 'setName', setData.setName || setData.manufacture);
    setData.setName = setData.setName || setName;
    await getNextFilter('variantType?', 'variant', setData.variant);

    if (filters.variant.includes('insert')) {
      const insert = await getNextFilter('Insert?', 'variantName', setData.insert);
      setData.insert = setData.insert || insert;
    }

    if (filters.variant.includes('parallel')) {
      const parallel = await getNextFilter('Parallel?', 'variantName', setData.parallel);
      setData.parallel = setData.parallel || parallel;
    }

    setData.bscFilters = buildBody(filters);

    finish(JSON.stringify(setData));
  } catch (e) {
    error(e);
  }

  return setData;
}

export async function uploadToBuySportsCards(cardsToUpload) {
  const { finish: finishOuter, error: errorOuter } = showSpinner('upload', 'Uploading to BSC');
  const api = await login();
  const notAdded = [];

  for (const key in cardsToUpload) {
    const { error, finish } = showSpinner(`upload-${key}`, `Uploading set ${key}`);
    const setData = await getGroupByBin(key);
    if (setData) {
      const { update } = showSpinner(
        `upload-${key}`,
        `Uploading set ${setData.year} ${setData.setName} ${setData.insert || ''} ${setData.parallel || ''}`,
      );
      update('looking for set');
      let listings = {};
      if (setData.bscFilters) {
        update(`Fetching listings for ${JSON.stringify(setData.bscFilters)}`);
        const response = await api.post('seller/bulk-upload/results', setData.bscFilters);
        listings = response.data.results;
      } else {
        update('Searching for set for the first time');
        let { body, allPossibleListings } = await getAllListings(setData);
        listings = allPossibleListings.results;
        setData.bscFilters = body;
        await updateGroup(setData);
      }

      if (listings && listings.length > 0) {
        const updates = [];
        let updated = 0;
        update('Adding Cards');
        await Promise.all(
          listings.map(async (listing) => {
            const card = cardsToUpload[key].find((card) => listing.card.cardNo === card.cardNumber);
            if (card) {
              const {
                update: updateSKU,
                finish: finishSKU,
                error: errorSKU,
              } = showSpinner(`upload-${card.sku}`, `Uploading ${card.title}`);
              try {
                const newListing = {
                  ...listing,
                  availableQuantity: listing.availableQuantity + card.quantity,
                  price: card.bscPrice,
                  sellerSku: card.sku || card.bin,
                };
                if (card.directory) {
                  if (card.frontImage) {
                    updateSKU(`Front Image`);
                    newListing.sellerImgFront = (
                      await postImage(
                        'common/card/undefined/product/undefined/attachment',
                        `output/${card.directory}${card.frontImage}`,
                      )
                    ).objectKey;
                    newListing.imageChanged = true;
                  }
                  if (card.backImage) {
                    updateSKU(`Back Image`);
                    newListing.sellerImgBack = (
                      await postImage(
                        'common/card/undefined/product/undefined/attachment',
                        `output/${card.directory}${card.backImage}`,
                      )
                    ).objectKey;
                    newListing.imageChanged = true;
                  }
                }
                updates.push(newListing);
                updated++;
                finishSKU(card.title);
              } catch (e) {
                errorSKU(e, card.title);
              }
            } else if (listing.availableQuantity > 0) {
              updates.push(listing);
            }
          }),
        );

        if (updated > 0) {
          update('Uploading Results');
          if (updated < cardsToUpload[key].length) {
            const nonUpdated = cardsToUpload[key].filter(
              (card) => !updates.find((listing) => listing.card.cardNo === card.cardNumber),
            );
            notAdded.push(...nonUpdated);
          }
          try {
            await saveBulk(updates);
            finish(`Added ${updates.length} cards to ${key}`);
          } catch (e) {
            error(e);
            notAdded.push(...cardsToUpload[key]);
          }
        }
      } else {
        error(`Could not find set ${key}`);
        notAdded.push(...cardsToUpload[key]);
      }
    } else {
      error(`Could not find set data for ${key}`);
      notAdded.push(...cardsToUpload[key]);
    }
    finish();
  }

  if (notAdded.length > 0) {
    errorOuter(`Failed to add ${notAdded.length} cards to BSC`);
  } else {
    finishOuter('All cards added to BSC');
  }
}

const findListing = async (listings, card) => {
  const { update, finish } = showSpinner('find-listing', `Finding listing for ${card.title}`);
  let found = false;

  //look for exact card number match
  let listing = listings.find((listing) => listing.card.cardNo.toString() === card.cardNumber.toString());
  if (listing) {
    finish();
    return listing;
  }

  update('Fuzzy Card Number Match');
  if (!found) {
    listing = listings.find(
      (listing) => listing.card.cardNo.replaceAll(/\D/g, '') === card.cardNumber.replaceAll(/\D/g, ''),
    );
    if (listing) {
      found = await ask(`Is this a match? ${listing.card.cardNo} ${listing.card.players}`, true);
    }
  }

  update('checking for player name');
  if (!found && card.player) {
    const names = card.player.toLowerCase().split(/\s+/);
    listing = listings.find((listing) => names.every((name) => listing.card.players.toLowerCase().includes(name)));
    if (listing) {
      found = await ask(`Is this a match? ${listing.card.cardNo} ${listing.card.players}`, true);
    }
  }

  update('Asking for match');
  if (!found) {
    const selectOptions = [
      { name: 'None', value: null },
      ...listings.map((listing) => ({
        name: `${listing.card.cardNo} ${listing.card.players}`,
        value: listing,
      })),
    ];
    const answer = await ask(`Which listing is this? ${chalk.redBright(card.title)}`, undefined, { selectOptions });
    if (answer) {
      listing = answer;
      found = true;
    }
  }

  finish();
  return found ? listing : undefined;
};

export async function removeWithAPI(cardsToRemove) {
  const { finish, error } = showSpinner('remove-details', `Removing ${Object.keys(cardsToRemove).length} sets`);
  const api = await login();
  const notRemoved = [];
  for (const key in cardsToRemove) {
    const {
      update: updateSet,
      finish: finishSet,
      error: errorSet,
    } = showSpinner(`remove-key-${key}`, `Removing ${key}`);
    try {
      const setData = await parseKey(key, true);

      let listings;
      if (setData.bscFilters) {
        updateSet(`Getting exact results `);
        const response = await api.post('seller/bulk-upload/results', setData.bscFilters);
        listings = response.data.results;
      } else {
        updateSet(`Searching for listings`);
        let { body, allPossibleListings } = await getAllListings(setData);
        listings = allPossibleListings.results;
        if (listings?.length === 0) {
          setData.bscFilters = body;
          await updateGroup(setData);
        }
      }

      if (listings && listings.length > 0) {
        let updated = 0;
        updateSet(`Searching for listings`);
        for (const card of cardsToRemove[key]) {
          const {
            update: updateCard,
            finish: finishCard,
            error: errorCard,
          } = showSpinner(`remove-card-${card.title}`, `Removing ${card.title}`);
          updateCard(`Finding listing`);
          const listing = await findListing(listings, card);
          if (listing) {
            updateCard(`Updating quantity`);
            let newQuantity = listing.availableQuantity + card.quantity;
            if (newQuantity < 0) {
              newQuantity = 0;
            }
            listing.availableQuantity = newQuantity;
            updated++;
            finishCard(`Setting quantity of ${card.title} to ${newQuantity}`);
          } else {
            card.error = 'No match in set';
            notRemoved.push(card);
            errorCard(`No match for ${card.title}`);
          }
        }

        if (updated > 0) {
          updateSet(`Saving updates`);
          await saveBulk(listings);
          finishSet();
        }
      } else {
        notRemoved.push(...cardsToRemove[key].map((card) => ({ ...card, error: 'No Set Found' })));
        errorSet(`Could not find any listings for ${key}`);
      }
    } catch (e) {
      notRemoved.push(...cardsToRemove[key].map((card) => ({ ...card, error: e.message })));
      errorSet(e);
    }
  }

  if (notRemoved.length > 0) {
    error(`Failed to remove ${notRemoved.length} cards from BuySportsCards`);
  } else {
    finish('All cards removed from BuySportsCards');
  }
}

export async function removeFromBuySportsCards(cardsToRemove) {
  const { finish } = showSpinner('remove', 'BSC Starting Removal');
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
  finish();
}
