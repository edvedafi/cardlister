import { ask } from '../utils/ask.js';
import dotenv from 'dotenv';
import { Browser, Builder, By, Key, until } from 'selenium-webdriver';
import { caseInsensitive, parseKey, useWaitForElement, useWaitForElementToBeReady, waitForElement } from './uploads.js';
import { validateUploaded } from './validate.js';
import chalk from 'chalk';
import { manufactures, titleCase } from '../utils/data.js';
import pRetry, { AbortError } from 'p-retry';

dotenv.config();

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
};

const login = async () => {
  if (!_driver) {
    _driver = await new Builder().forBrowser(Browser.CHROME).build();
    await _driver.get('https://www.buysportscards.com');
    const waitForElement = useWaitForElement(_driver);

    const waitForButton = userWaitForButton(_driver);

    const signInButton = await waitForButton('sign in');
    await signInButton.click();

    const emailInput = await waitForElement(By.id('email'));
    await emailInput.sendKeys(process.env.BSC_EMAIL);
    const passwordInput = await waitForElement(By.id('password'));
    await passwordInput.sendKeys(process.env.BSC_PASSWORD);

    //click the  button with id "next"
    const nextButton = await waitForElement(By.id('next'));
    await nextButton.click();
    await waitForButton('welcome back,');

    await _driver.findElement(By.css('body')).sendKeys(Key.F12);
  }

  const reduxAsString = await _driver.executeScript(
    'return Object.values(localStorage).find((value) => value.includes("secret"));',
  );
  const redux = JSON.parse(reduxAsString);
  baseHeaders.authorization = `Bearer ${redux.secret}`;
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
    console.group(`**Error from BSC ${method} ${path}`);
    if (body) {
      console.log('Body: ', JSON.stringify(body, null, 2));
      console.log('Body Keys', Object.keys(body));
    }
    if (responseObject) console.log('Response: ', JSON.stringify(responseObject, null, 2));

    console.group(
      `END Error from ${method} https://api-prod.buysportscards.com/${path}: ${responseObject.status} ${responseObject.statusText}`,
    );
    console.groupEnd();
    throw new Error(
      `Error from ${method} https://api-prod.buysportscards.com/${path}: ${responseObject.status} ${responseObject.statusText}`,
    );
  }

  const text = await responseObject.text();

  if (text === '' || text.trim().length === 0) {
    // console.group('Empty response from BSC');
    // if (body) {
    //   console.log(JSON.stringify(body, null, 2));
    // }
    // console.log('path: ', `https://api-prod.buysportscards.com/${path}`);
    // console.groupEnd();
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

export async function shutdownBuySportsCards() {
  await _driver?.quit();
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
      const setData = parseKey(key);
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
      // const defaultPriceInput = await waitForElement(By.id('defaultPrice'));
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

          if (card.bscPrice) {
            const priceTextBox = await columns[5].findElement({ css: 'input' });
            await priceTextBox.clear();
            await driver.wait(until.elementTextIs(priceTextBox, ''), 5000);
            await priceTextBox.sendKeys(card.bscPrice);
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

export const uploadToBuySportsCards = async (groupedCards) => {
  console.log(chalk.magenta('BSC Starting Upload'));
  console.log('Uploading:', Object.keys(groupedCards));
  await runUpdates(groupedCards);
  console.log(chalk.magenta('BSC Upload COMPLETE!'));
};

export async function getBuySportsCardsSales() {
  console.log(chalk.magenta('Checking BuySportsCards for Sales'));
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

  for (const order of history.results) {
    const orderDetails = await get(`seller/order/${order.orderId}`);

    for (const item of orderDetails.orderItems) {
      const card = {
        cardNumber: item.card.cardNo,
        year: item.card.year,
        setName: item.card.setName.replace(item.card.year, '').trim(),
        sport: item.card.sport,
        player: item.card.players,
        quantity: item.orderQuantity,
        platform: `BSC: ${order.buyer.username}`,
        title: `${item.card.setName} ${item.card.variantName} #${item.card.cardNo} ${item.card.players}`,
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
    }
  }

  console.log(chalk.magenta('Found'), chalk.green(sales.length), chalk.magenta('cards sold on BuySportsCards'));
  return sales;
}

export async function removeWithAPI(cardsToRemove) {
  await login();
  const notRemoved = [];
  for (const key in cardsToRemove) {
    const buildBody = (filters) => ({
      currentListings: true,
      condition: 'near_mint',
      productType: 'raw',
      filters: Object.keys(filters).reduce((result, key) => {
        result[key] = [filters[key]?.toString().toLowerCase().replaceAll(' ', '-')];
        return result;
      }, {}),
    });

    const setData = parseKey(key, true);
    console.log('Removing: ', key);
    // console.log('cardsToRemove[key]', cardsToRemove[key]);
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

    let allPossibleListings;
    try {
      // console.log('looking for listings', buildBody(filters));
      allPossibleListings = await post('seller/bulk-upload/results', buildBody(filters));

      // console.log('first listings', allPossibleListings);
      if (!allPossibleListings.results || allPossibleListings.results.length === 0) {
        throw new Error('No listings found');
      }
    } catch (e) {
      // console.log(e);
      console.log(chalk.red('Error getting listings for'), setData);
      filters = {
        sport: [setData.sport],
        year: [setData.year],
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

      filters.setName = await getNextFilter('Which set would you like to remove?', 'setName');

      if (setData.parallel) {
        filters.variant = ['parallel'];
        filters.variantName = await getNextFilter('Which parallel is this?', 'variantName');
        if (filters.variantName === 'None') {
          filters.variant = ['insert'];
          filters.variantName = await getNextFilter('Which insert is this?', 'variantName');
        }
      } else if (setData.insert) {
        filters.variant = ['insert'];
        filters.variantName = await getNextFilter('Which insert is this?', 'variantName');
        if (filters.variantName === 'None') {
          filters.variant = ['parallel'];
          filters.variantName = await getNextFilter('Which parallel is this?', 'variantName');
        }
      } else {
        filters.variant = ['base'];
      }

      if (filters.variantName === 'None') {
        console.log(chalk.red('Could not find a match for'), key);
        notRemoved.push(...cardsToRemove[key]);
      } else {
        allPossibleListings = await post('seller/bulk-upload/results', buildBody(filters));
      }
    }

    const listings = allPossibleListings.results;

    if (listings && listings.length > 0) {
      // console.log('cards to remove', cardsToRemove);
      // console.log(`cards for ${key}: `, cardsToRemove[key]);
      let updated = 0;
      cardsToRemove[key].forEach((card) => {
        const listing = listings.find((listing) => listing.card.cardNo === card.cardNumber);
        if (listing) {
          // console.log('found listing', listing);
          let newQuantity = listing.availableQuantity + card.quantity;
          if (newQuantity < 0) {
            newQuantity = 0;
          }
          listing.availableQuantity = newQuantity;
          updated++;
        } else {
          console.log('did not find', card);
          notRemoved.push(card);
        }
      });

      if (updated > 0) {
        try {
          await pRetry(
            async () => {
              const results = await put('seller/bulk-upload', {
                sellerId: 'cf987f7871',
                listings,
              });
              if (results.result === 'Saved!') {
                // console.log('removed', key);
              } else {
                throw new Error('Failed to remove cards');
              }
            },
            { retries: 5 },
          );
          console.log(chalk.green('Removed'), chalk.green(updated), chalk.green('cards from BSC'));
        } catch (e) {
          console.log(chalk.red('Failed to remove cards from BSC'));
          notRemoved.push(...cardsToRemove[key]);
        }
      }
    } else {
      console.log(chalk.red('Could not find any listings for'), key, buildBody(filters));
      console.log('allPossibleListings', allPossibleListings);
      notRemoved.push(...cardsToRemove[key]);
    }
  }
  if (notRemoved.length > 0) {
    notRemoved.forEach((card) => {
      console.log(chalk.red('Could not remove:'), card.title);
    });
  } else {
    console.log(chalk.green('All cards removed from BSC'));
  }
}

export async function removeFromBuySportsCards(cardsToRemove) {
  console.log(chalk.magenta('BSC Starting Removal'));
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
  console.log(chalk.magenta('BSC Completed Removal'));
}
