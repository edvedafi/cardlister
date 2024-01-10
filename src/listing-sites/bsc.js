import { ask } from '../utils/ask.js';
import dotenv from 'dotenv';
import { Browser, Builder, By, Key, until } from 'selenium-webdriver';
import { caseInsensitive, parseKey, useWaitForElement, useWaitForElementToBeReady } from './uploads.js';
import { validateUploaded } from './validate.js';
import chalk from 'chalk';
import { manufactures, titleCase } from '../utils/data.js';
import pRetry from 'p-retry';
import FormData from 'form-data';
import { getGroupByBin, updateGroup } from './firebase.js';
import chalkTable from 'chalk-table';
import { useSpinners } from '../utils/spinners.js';

dotenv.config();

const color = chalk.hex('#e5e5e5');
const { showSpinner, finishSpinner, errorSpinner, updateSpinner, pauseSpinners, resumeSpinners, log } = useSpinners(
  'bsc',
  color,
);

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

const login = async () => {
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

    finishSpinner('login');
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

  // console.log('formData', formData.getHeaders());
  // console.log('baseHeaders', baseHeaders);
  // console.log('headers', {
  //   ...baseHeaders,
  //   ...formData.getHeaders(),
  // });

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

const useWaitForPageToLoad =
  (driver) =>
  async (url = undefined) => {
    if (url) {
      await driver.wait(until.urlIs(url), 10000);
    }
    try {
      const element = await useWaitForElement(driver)(By.className('MuiSkeleton-pulse'));
      await driver.wait(until.stalenessOf(element), 10000); // Adjust the timeout as needed (in milliseconds)
    } catch (e) {
      //do nothing
      console.log('Waiting for page to load error');
    }
  };
const runUpdates = async (groupedCards) => {
  try {
    const driver = await login();
    const waitForElement = useWaitForElement(driver);
    const waitForElementToBeReady = useWaitForElementToBeReady(driver);
    const waitForPageLoad = useWaitForPageToLoad(driver);

    const waitForButton = (text) =>
      waitForElement(By.xpath(`//button[descendant::text()${caseInsensitive(text.toLowerCase())}]`));

    await driver.get('https://www.buysportscards.com/sellers/bulk-upload');

    for (const key in groupedCards) {
      const setData = getGroupByBin(key);
      const setFilter = async (placeHolderField, checkboxValue) => {
        const sportSearchField = await waitForElement(By.xpath(`//input[@placeholder='${placeHolderField}']`));
        await sportSearchField.clear();
        await sportSearchField.sendKeys(checkboxValue?.trim());
        await new Promise((resolve) => setTimeout(resolve, 100));
        const parentElement = await sportSearchField.findElement(By.xpath('../../..'));
        let found;
        try {
          const checkbox = await parentElement.findElement(
            By.xpath(
              `//input[@type='checkbox' and translate(@value, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') = '${checkboxValue
                .toLowerCase()
                .trim()
                .replaceAll(' ', '-')}']`,
            ),
          );
          if (checkbox) {
            await checkbox.click();
            found = true;
          }
        } catch (err) {
          found = false;
        }
        return found;
      };

      await setFilter('Search Sport', setData.sport || 'Multi-Sport');
      await setFilter('Search Year', setData.year);
      let foundSet = await setFilter('Search Set', `${setData.manufacture} ${setData.setName}`);
      if (!foundSet) {
        foundSet = await setFilter('Search Set', setData.setName);
        if (!foundSet) {
          console.log(`Please select ${chalk.red(setData.manufacture)} ${chalk.red(setData.setName)} to continue.`);
        }
      }
      if (setData.insert) {
        await setFilter('Search Variant', 'Insert');
        const foundVariant = await setFilter('Search Variant Name', `${setData.insert} ${setData.parallel || ''}`);
        if (!foundVariant) {
          console.log(
            `Please select ${chalk.red(setData.insert)}${
              setData.parallel ? chalk.red(' ' + setData.parallel) : ''
            } to continue.`,
          );
        }
      } else if (setData.parallel) {
        await setFilter('Search Variant', 'Parallel');
        const foundParallel = await setFilter('Search Variant Name', setData.parallel);
        if (!foundParallel) {
          console.log(`Please select ${chalk.red(setData.parallel)} to continue.`);
        }
      } else {
        if (setData.insert === 'The Franchise') {
          await ask('checkbox');
        }
        const checkbox = await waitForElement(By.xpath(`//input[@type='checkbox' and @value='base']`), true);
        await checkbox.click();
      }

      const conditionSelect = await waitForElement(By.css('.MuiSelect-select'));
      await conditionSelect.click();
      const conditionList = await waitForElement(By.xpath(`//*[@data-value='near_mint' or @data-value='nm']`));
      await conditionList.click();
      if (setData.bscPrice) {
        const defaultPriceInput = await waitForElement(
          By.xpath('//div[p[text()="Default Price:"]]/following-sibling::div/div/div/input'),
        );
        await defaultPriceInput.clear();
        await defaultPriceInput.sendKeys(setData.bscPrice);
      }

      const defaultSkuInput = await waitForElement(
        By.xpath('//div[p[text()="Default SKU:"]]/following-sibling::div/div/div/input'),
      );
      await defaultSkuInput.clear();
      await defaultSkuInput.sendKeys(setData.bin);

      const nextButton = await waitForButton('Generate');
      await nextButton.click();

      await new Promise((resolve) => setTimeout(resolve, 100));

      let pageAdds = 0;
      let added = [];
      //tr[.//*[contains(text(), '2023') and contains(text(), 'Topps') and contains(text(), 'Refractor')]]
      let matcherForSet = `//h6[contains(text(), '${setData.year}')`; // and contains(text(), '${setData.setName}')`;
      `${setData.setName} ${setData.insert || ''} ${setData.parallel || ''}`
        .replaceAll('  ', ' ')
        .trim()
        .split(' ')
        .forEach((word) => {
          matcherForSet += ` and contains(text(), '${word}')`;
        });
      matcherForSet = matcherForSet.trim() + ']';
      console.log('matcherForSet', matcherForSet);
      await waitForElement(By.xpath(matcherForSet));
      let tables = await driver.findElements(By.css(`.MuiTable-root`));
      await waitForElementToBeReady(tables[0]);
      const table = tables[0];
      const body = await table.findElement(By.xpath(`./tbody`));
      await waitForElementToBeReady(body);
      const cardsToUpload = groupedCards[key];

      const processRow = async (row, card, logEachCard = false) => {
        const columns = await row.findElements(By.xpath(`./td`));

        // console.log('uploading: ', card);
        let cardNumberTextBox = await columns[6].findElement({ css: 'input' });
        const currentValue = await cardNumberTextBox.getAttribute('value');
        let newQuantity = card.quantity;
        if (currentValue) {
          await cardNumberTextBox.sendKeys('\u0008\u0008');
          newQuantity += Number.parseInt(currentValue);

          if (newQuantity < 0) {
            newQuantity = 0;
          }

          if (card.bscPrice && card.bscPrice !== setData.bscPrice) {
            const priceTextBox = await columns[5].findElement({ css: 'input' });
            await priceTextBox.clear();
            await driver.wait(until.elementTextIs(priceTextBox, ''), 5000);
            await priceTextBox.sendKeys(card.bscPrice);
          }

          if (card.sku) {
            const skuTextBox = await columns[7].findElement({ css: 'input' });
            await skuTextBox.clear();
            await driver.wait(until.elementTextIs(skuTextBox, ''), 5000);
            await skuTextBox.sendKeys(card.sku);
          }

          await driver.wait(until.elementTextIs(cardNumberTextBox, ''), 5000);
          await cardNumberTextBox.sendKeys(newQuantity);

          try {
            if (card.frontImage || card.backImage) {
              //find the buttons inside columns[3] that have "x" as the text
              const buttons = await columns[3].findElements(By.xpath(`.//div[text()='X']`));
              for (let button of buttons) {
                try {
                  // await driver.wait(until.elementToBeClickable(button), 5000); // Adjust the timeout as needed

                  await button.click();
                } catch (e) {
                  //button wasn't click-able. just move on.
                }
              }

              const imageInputs = await columns[3].findElements(By.xpath(`.//input[@type='file']`));
              if (card.frontImage) {
                const b = await columns[3].findElement(By.id(`addPhotoFront${i}`));
                await driver.wait(until.elementIsEnabled(b), 1000);
                await b.click();
                await imageInputs[0].sendKeys(`${process.cwd()}/output/${card.directory}${card.frontImage}`);
                // await new Promise((resolve) => setTimeout(resolve, 1000));
                // await ask('Press any key to continue.');
              }
              if (card.backImage) {
                await imageInputs[1].sendKeys(`${process.cwd()}/output/${card.directory}${card.backImage}`);
                // await new Promise((resolve) => setTimeout(resolve, 1000));
                // await ask('Press any key to continue.');
              }
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
            if (logEachCard) {
              console.log(`Updated Card ${chalk.green(card.cardNumber)}${card.frontImage ? ' with images' : ''}`);
            }
          } catch (e) {
            if (logEachCard) {
              console.log(`Failed to add Image to card ${chalk.red(card.cardNumber)}`);
            }
          }

          pageAdds++;
          added.push(card);
        }
        let count = 0;
        if (cardsToUpload.length > 20) {
          await iterateOverRows(cardsToUpload, body, processRow);
        } else {
          await iterateOverCards(cardsToUpload, body, processRow);
        }

        await validateUploaded(cardsToUpload, added, 'bscPrice');

        await driver.executeScript('window.scrollTo(0, 0);');
        if (pageAdds > 0) {
          const saveButton = await waitForButton('Save');
          await saveButton.click();

          await waitForElement(By.className('MuiAlert-filledSuccess'));
        }

        console.log(`Updated ${chalk.green(pageAdds)} cards for ${chalk.cyan(key)}`);

        const reset = await waitForButton('Reset');
        await reset.click();
      };
    }
  } catch (e) {
    console.log('error', e);
    throw e;
  }
};

const iterateOverRows = async (cardsToUpdate, body, processRow) => {
  const rows = await body.findElements(By.xpath(`./tr`));
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const columns = await row.findElements(By.xpath(`./td`));
    const cardNumberElement = await columns[1].findElement(By.xpath('./*'));
    const tableCardNumber = await cardNumberElement.getText();
    const card = cardsToUpdate.find((card) => card.cardNumber.toString() === tableCardNumber);
    if (card) {
      await processRow(row, card);
    }
  }
};

const iterateOverCards = async (cardsToUpdate, body, processRow) => {
  for (const card of cardsToUpdate) {
    try {
      const row = await body.findElement(
        By.xpath(
          `//tr[.//*[contains(text(), '#${card.cardNumber}') and not(normalize-space(substring-after(text(), '#${card.cardNumber}')))]]`,
        ),
      );
      if (row) {
        await processRow(row, card);
      } else {
        console.log('could not find card ', card);
      }
    } catch (e) {
      await ask(`could not find card ${card.title} in table. Please update manually and Press any key to continue.`);
    }
  }
};

export const uploadToBuySportsCardsOldUI = async (groupedCards) => {
  console.log(chalk.magenta('BSC Starting Upload'));
  console.log('Uploading:', Object.keys(groupedCards));
  await runUpdates(groupedCards);
  console.log(chalk.magenta('BSC Upload COMPLETE!'));
};

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

async function getAllListings(setData) {
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
    const spinners = pauseSpinners();
    filters = {
      sport: [setData.sport],
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

    resumeSpinners(spinners);
    showSpinner('get-listings', `Getting listings for ${JSON.stringify(filters)}`);

    if (filters.variantName === 'None') {
      console.log(chalk.red('Could not find a match for'), setData);
    } else {
      allPossibleListings = await post('seller/bulk-upload/results', buildBody(filters));
    }
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
        for (const listing of listings) {
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
            } catch {
              errorSpinner(`upload-${card.sku}`, `Error adding ${card.title}: ${e.message}`);
            }
          } else if (listing.availableQuantity > 0) {
            updates.push(listing);
          }
        }

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
  const paused = pauseSpinners();

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

  resumeSpinners(paused);

  return found ? listing : undefined;
};

export async function removeWithAPI(cardsToRemove) {
  showSpinner('remove-details', 'Login');
  await login();
  const notRemoved = [];
  showSpinner('remove-details', `Removing ${Object.keys(cardsToRemove).length} sets`);
  for (const key in cardsToRemove) {
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
