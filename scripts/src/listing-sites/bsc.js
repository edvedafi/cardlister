import { ask } from '../utils/ask.js';
import dotenv from 'dotenv';
import { Browser, Builder, By, Key } from 'selenium-webdriver';
import { caseInsensitive, parseKey, useWaitForElement } from './uploads.js';
import { manufactures, titleCase } from '../utils/data.js';
import pRetry from 'p-retry';
import FormData from 'form-data';
import { getGroupByBin, updateGroup } from './firebase.js';
import { useSpinners } from '../utils/spinners.js';
import axios from 'axios';
import Queue from 'queue';

dotenv.config();

const { showSpinner, log } = useSpinners('bsc', '#e5e5e5');

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

async function postImage(path, imagePath) {
  const fileName = imagePath.substring(imagePath.lastIndexOf('/'));
  const { finish, error, update } = showSpinner(`post-image-${fileName}`, `Uploading ${fileName}`);
  const api = await login();

  const formData = new FormData();

  formData.append('attachment', fs.createReadStream(imagePath));

  let count = 0;
  let data;

  await pRetry(
    async () => {
      count++;
      if (count > 1) {
        update(`Attempt ${count} of 5`);
      }
      const { data: results } = await api.post(`https://api-prod.buysportscards.com/${path}`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });
      if (results.objectKey) {
        data = results;
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

  return data;
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
  let allPossibleListings = {};
  let filters = {
    sport: [setData.sport],
    year: [setData.year],
    setName: [setData.setName],
  };
  try {
    const api = await login();
    if (setData.parallel) {
      filters.variant = ['parallel'];
      filters.variantName = [setData.parallel];
    } else if (setData.insert) {
      filters.variant = ['insert'];
      filters.variantName = [setData.insert];
    } else {
      filters.variant = ['base'];
    }

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
        if (filterOptions.aggregations) {
          const response = await ask(text, undefined, {
            selectOptions: [{ name: 'None', description: 'None of the options listed are correct' }].concat(
              filterOptions.aggregations[filterType].map((variant) => ({
                name: variant.label,
                value: variant.slug,
              })),
            ),
          });
          return [response];
        } else {
          throw new Error('No filters found: ' + JSON.stringify(filterOptions));
        }
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

      const response = await api.post('seller/bulk-upload/results', buildBody(filters));
      allPossibleListings = response.data;
    }
  } catch (e) {
    error(e);
    throw e;
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
        selectOptions: filterOptions.aggregations[filterType]
          .map((variant) => ({
            name: variant.label,
            value: variant,
          }))
          .concat([{ name: 'None', value: null, description: 'None of the options listed are correct' }]),
      });

      if (!response || response === 'None') {
        return;
      }
      filters[filterType] = [response.slug];
      return response.label;
    };

    setData.sport = await getNextFilter('Sport?', 'sport', setData.sport);
    if (!setData.sport) {
      return {
        bscFilters: { skip: true },
      };
    } else {
      setData.sport = setData.sport.toLowerCase();
    }

    setData.year = await getNextFilter('Year?', 'year', setData.year);
    if (!setData.manufacture) {
      setData.manufacture = await ask('Manufacturer?');
    }
    const setName = await getNextFilter('Set Name?', 'setName', setData.setName || setData.manufacture);
    if (setName) {
      setData.setName = setData.setName || setName;
      await getNextFilter('variantType?', 'variant', setData.variant);

      if (filters.variant.includes('insert')) {
        setData.insert = await getNextFilter('Insert?', 'variantName', setData.insert);
      } else {
        setData.insert = null;
      }

      if (filters.variant.includes('parallel')) {
        setData.parallel = await getNextFilter('Parallel?', 'variantName', setData.parallel);
      } else {
        setData.parallel = null;
      }

      setData.bscFilters = buildBody(filters);
    } else {
      const tryAgain = await ask('Try Again?', true);
      if (tryAgain) {
        return findSetInfo(defaultValues);
      } else {
        setData.bscFilters = { skip: true };
      }
    }

    finish();
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
    const {
      error: errorKey,
      finish: finishKey,
      update: updateKey,
    } = showSpinner(`upload-${key}`, `Uploading set ${key}`);
    const setData = await getGroupByBin(key);
    if (setData) {
      updateKey('looking for set');
      let listings = {};
      if (setData.bscFilters) {
        if (setData.bscFilters.skip) {
          listings = undefined;
        } else {
          updateKey(`Fetching listings for ${JSON.stringify(setData.bscFilters)}`);
          const response = await api.post('seller/bulk-upload/results', setData.bscFilters);
          listings = response.data.results;
        }
      } else {
        updateKey('Searching for set for the first time');
        let { body, allPossibleListings } = await getAllListings(setData);
        listings = allPossibleListings.results;
        setData.bscFilters = body;
        await updateGroup(setData);
      }

      // log(cardsToUpload[key].map((card) => card.cardNumber));
      // log('Listings', listings?.filter((l) => parseInt(l.card.cardNo) < 20).length);
      if (listings && listings.length > 0) {
        const queueResults = [];
        let updated = 0;
        updateKey('Adding Cards');

        const queue = new Queue({
          results: queueResults,
          autostart: true,
          concurrency: 5,
        });

        listings.forEach((currentListing, i) =>
          queue.push(async () => {
            let listing = currentListing;
            const {
              update: updateSKU,
              finish: finishSKU,
              error: errorSKU,
            } = showSpinner(
              `upload-${key}-${listing.card.cardNo}`,
              `Uploading #${listing.card.cardNo} ${listing.card.players}`,
            );
            // log(`upload-${key}-${listing.card.cardNo}`);
            const card = cardsToUpload[key].find((card) => `${listing.card.cardNo}` === `${card.cardNumber}`);
            // log('card:', card);
            if (card) {
              try {
                if (listings[i + 1]) {
                  const options = [
                    {
                      name: `${listing.card.cardNo} ${listing.card.players} ${listing.card.playerAttribute}`,
                      value: listing,
                    },
                  ];
                  const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
                  let checkNext = true;
                  let letter = 0;
                  while (i + 1 < listings.length && checkNext) {
                    const next = listings[i + 1];
                    if (next.card.cardNo === `${card.cardNumber}${letters[letter++]}`) {
                      options.push({
                        name: `${next.card.cardNo} ${next.card.players} ${next.card.playerAttribute}`,
                        value: next,
                      });
                      checkNext = letter < letters.length;
                    } else {
                      checkNext = false;
                    }
                  }
                  if (options.length > 1) {
                    const answer = await ask(`Which listing is this? ${chalk.redBright(card.title)}`, undefined, {
                      selectOptions: options,
                    });
                    if (answer) {
                      listing = answer;
                    }
                  }
                  //
                  // const b = listings[i + 1];
                  // if ( b ) {
                  //   if (b && b.card.cardNo === `${card.cardNumber}b`) {
                  //     options.push({
                  //       name: `${b.card.cardNo} ${b.card.players} ${
                  //         b.card.playerAttribute
                  //       }`,
                  //       value: b,
                  //     });
                  //   }
                  //   const c = listings[i + 2];
                  //   if (listings[i + 2].card.cardNo === `${card.cardNumber}c`) {
                  //     options.push({
                  //       name: `${listings[i + 2].card.cardNo} ${listings[i - 1].card.players} ${
                  //         listings[i + 2].card.playerAttribute
                  //       }`,
                  //       value: listings[i + 2],
                  //     });
                  //   }
                  //   if (options.length > 1) {
                  //     const answer = await ask(`Which listing is this? ${chalk.redBright(card.title)}`, undefined, {
                  //       selectOptions: options,
                  //     });
                  //     if (answer) {
                  //       listing = answer;
                  //     }
                  //   }
                  // }
                }
                const newListing = {
                  ...listing,
                  availableQuantity: card.quantity,
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
                updated++;
                finishSKU(card.title);
                return newListing;
              } catch (e) {
                errorSKU(e);
              }
            } else if (listing.availableQuantity > 0) {
              // errorSKU(`No match for ${listing.card.cardNo}, but available quantity is ${listing.availableQuantity}`);
              // log(`No match for ${listing.card.cardNo}`);
              finishSKU();
              return listing;
            } else {
              finishSKU();
              // errorSKU(`No match for ${listing.card.cardNo}`);
              // log(`No match for ${listing.card.cardNo}`);
            }
          }),
        );

        await new Promise((resolve) => queue.addEventListener('end', resolve));

        const updates = queueResults.map((result) => (result ? result[0] : null)).filter((result) => result);

        if (updates.length > 0) {
          updateKey('Uploading Results');
          if (updated < cardsToUpload[key].length) {
            const nonUpdated = cardsToUpload[key].filter(
              (card) => !updates.find((listing) => listing.card.cardNo === card.cardNumber),
            );
            notAdded.push(...nonUpdated);
          }
          try {
            await saveBulk(updates);
            finishKey(`Uploaded ${updates.length} which contained ${cardsToUpload[key].length} new cards to ${key}`);
          } catch (e) {
            errorKey(e, `Failed to save ${cardsToUpload[key].length} cards to ${key}`);
            notAdded.push(...cardsToUpload[key]);
          }
        } else {
          finishKey(`No new cards to upload to ${key}`);
        }
      } else {
        errorKey(`Could not find set ${key}`);
        notAdded.push(...cardsToUpload[key]);
      }
    } else {
      errorKey(`Could not find set data for ${key}`);
      notAdded.push(...cardsToUpload[key]);
    }
  }

  if (notAdded.length > 0) {
    errorOuter(`Failed to add ${notAdded.length} cards to BSC`);
    // log(notAdded.map((card) => card.cardNumber));
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

export async function updateBSCSKU(setInfo, counts) {
  const { update, finish, error } = showSpinner('update-bsc-sku', `Updating BSC SKU for ${setInfo.skuPrefix}`);
  update('Login');
  const api = await login();
  // log(counts);
  update('Getting Listings');
  const listings = await api.post('seller/bulk-upload/results', {
    currentListings: true,
    condition: 'near_mint',
    productType: 'raw',
    filters: setInfo.bscFilters,
  });
  const cards = listings.data.results;
  let updated = 0;
  update('Updating Cards');
  for (const card of cards) {
    // log(card.cardNo, card.availableQuantity, counts[card.cardNo]);
    let count = counts[card.card.cardNo];
    if (count || card.availableQuantity > 0) {
      card.availableQuantity = count?.quantity || 0;
      updated++;
    } else {
      card.availableQuantity = 0;
    }
  }
  if (updated < counts.length) {
    log(updated, counts.length);
    const firstCardNumber = cards[0].card.cardNo;
    //if the first card number contains any letters remove them
    const updateByPrefix = (prefix) =>
      prefix
        ? cards.forEach((card) => {
            const cardCount = counts[`${card.card.cardNo.substring(prefix.length, card.card.cardNo.length)}`];
            if (cardCount) {
              card.availableQuantity = cardCount.quantity || 0;
              updated++;
            } else {
              card.availableQuantity = 0;
            }
          })
        : false;

    updateByPrefix(firstCardNumber.replace(/\d/g, ''));

    if (updated < counts.length) {
      updateByPrefix(
        await ask(`No Cards found, is there a card number prefix (First Card Number: ${cards[0].card.cardNo})?`),
      );

      if (updated < counts.length) {
        const cardOptions = [{ value: 'None' }].concat(
          Object.values(counts).map((card) => ({
            name: card.description,
            description: card.description,
            value: card.quantity,
          })),
        );
        for (const card of cards) {
          const response = await ask(`How many of ${card.card.cardNo} ${card.card.players}?`, undefined, {
            selectOptions: cardOptions,
          });
          if (response !== 'None') {
            card.availableQuantity = response || 0;
            updated++;
          }
        }
      }
    }
  }

  update('Saving Updates');
  if (updated > 0) {
    await saveBulk(
      cards.map((card) =>
        card.availableQuantity > 0
          ? {
              ...card,
              sellerSku: `${setInfo.bin}|${card.cardNo}`,
            }
          : card,
      ),
    );
    finish(`Updated ${updated} cards`);
  } else {
    error('No cards updated');
  }
}

const getNextFilter = async (filters, text, filterType, defaultValue) => {
  const { finish, error } = showSpinner('setFilter', `Getting BSC Variant Name Filter`);
  try {
    const api = await login();
    const { data: filterOptions } = await api.post('search/bulk-upload/filters', filters);
    const filteredFilterOptions = filterOptions.aggregations[filterType].filter((option) => option.count > 0);
    if (filteredFilterOptions.length > 1) {
      const response = await ask(text, defaultValue, {
        selectOptions: filteredFilterOptions
          .map((variant) => ({
            name: variant.label,
            value: variant,
          }))
          .sort((a, b) => b.name.localeCompare(a.name)),
      });
      finish();
      return {
        name: response.label,
        filter:
          response.label === 'Base' || filterType === 'variantName'
            ? {
                filters: {
                  ...filters.filters,
                  [filterType]: [response.slug],
                },
              }
            : [response.slug],
      };
    } else if (filteredFilterOptions.length === 1) {
      finish();
      return { name: filteredFilterOptions[0].label, filter: [filteredFilterOptions[0].slug] };
    }
  } catch (e) {
    error(e);
    throw e;
  }
};

export const buildBSCFilters = (searchInfo) =>
  searchInfo.variantName?.metadata?.bsc || {
    filters: {
      sport: searchInfo.sport?.metadata?.bsc,
      year: searchInfo.year?.metadata?.bsc,
      setName: searchInfo.set?.metadata?.bsc,
      variant: searchInfo.variantType?.metadata?.bsc,
    },
  };

export const getBSCSportFilter = async (searchSport) =>
  getNextFilter(buildBSCFilters({}), 'BSC Sport', 'sport', searchSport);
export const getBSCYearFilter = (searchYear) => [searchYear];
export const getBSCSetFilter = async (searchInfo) => getNextFilter(buildBSCFilters(searchInfo), 'BSC Set', 'setName');
export const getBSCVariantTypeFilter = async (searchInfo) =>
  getNextFilter(buildBSCFilters(searchInfo), 'BSC Variant Type', 'variant');
export const getBSCVariantNameFilter = async (searchInfo) =>
  getNextFilter(buildBSCFilters(searchInfo), 'BSC Variant Name', 'variantName');

export async function getBSCCards(setInfo) {
  const { update, finish, error } = showSpinner('get-bsc-cards', `Getting BSC Cards for ${setInfo.handle}`);
  const api = await login();
  update('Getting Listings');

  const response = await api.post(`search/seller/results`, {
    condition: 'all',
    myInventory: 'false',
    page: 0,
    sellerId: 'cf987f7871',
    size: 50,
    sort: 'default',
    ...setInfo.metadata.bsc,
  });
  const cards = response.data.results;
  if (cards.length === 0) {
    log({
      condition: 'all',
      myInventory: 'false',
      page: 1,
      // sellerId: 'cf987f7871',
      size: 500,
      sort: 'default',
      ...setInfo.metadata.bsc,
    });
    log(response.data);
  }
  finish(`Found ${cards.length} cards`);
  return cards;
}
