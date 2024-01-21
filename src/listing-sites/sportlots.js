import { manufactures, sets } from '../utils/data.js';
import { Browser, Builder, By, until } from 'selenium-webdriver';
import { ask } from '../utils/ask.js';
import { caseInsensitive, getSelectOptions, useSetSelectValue, useWaitForElement } from './uploads.js';
import { validateUploaded } from './validate.js';
import chalk from 'chalk';
import { confirm } from '@inquirer/prompts';
import { getGroupByBin, updateGroup } from './firebase.js';
import { pauseSpinners, resumeSpinners, useSpinners } from '../utils/spinners.js';

const { showSpinner, finishSpinner, errorSpinner, updateSpinner, log } = useSpinners('sportlots', chalk.blueBright);

const brands = {
  bowman: 'Bowman',
  donruss: 'Donruss',
  fleer: 'Fleer',
  itg: 'ITG',
  'o-pee-chee': 'O-Pee-Chee',
  pacific: 'Pacific',
  panini: 'Panini',
  score: 'Score',
  sp: 'SP',
  'stadium club': 'Stadium Club',
  tops: 'Topps',
  ultra: 'Ultra',
  'upper deck': 'Upper Deck',
  ud: 'Upper Deck',
};

const conditions = ['NM', 'EX/NM', 'EX', 'VG', 'GOOD'];

const useClickSubmit =
  (waitForElement) =>
  async (text = undefined) => {
    showSpinner('clickSubmit', 'Looking for Submit button');
    const submitButton = text
      ? await waitForElement(By.xpath(`//input[(@type = 'submit' or @type = 'Submit') and @value='${text}']`))
      : await waitForElement(By.xpath("//input[@type = 'submit' or @type = 'Submit']"));
    updateSpinner('clickSubmit', 'Submitting');
    await submitButton.click();
    finishSpinner('clickSubmit');
  };

const useSelectBrand = (driver, inventoryURL, yearField, sportField, brandField) => async (setInfo) => {
  showSpinner('selectBrand', 'Selecting Brand');
  const waitForElement = useWaitForElement(driver);
  const clickSubmit = useClickSubmit(waitForElement);
  const setSelectValue = useSetSelectValue(driver);

  updateSpinner('selectBrand', `Navigating to Inventory ${inventoryURL}`);
  await driver.get(`https://sportlots.com/inven/dealbin/${inventoryURL}.tpl`);

  let found = false;

  try {
    const sport = { baseball: 'BB', football: 'FB', basketball: 'BK' }[setInfo.sport.toLowerCase()];
    updateSpinner('selectBrand', `Setting Sport to ${sport}`);
    await setSelectValue(sportField, sport);
    updateSpinner('selectBrand', `Setting Year to ${setInfo.sportlots?.year || setInfo.year}`);
    await setSelectValue(yearField, setInfo.sportlots?.year || setInfo.year);
    const brand =
      setInfo.sportlots?.manufacture ||
      brands[setInfo.setName?.toLowerCase()] ||
      brands[setInfo.manufacture?.toLowerCase()] ||
      'All Brands';
    updateSpinner('selectBrand', `Setting brand to ${brand}`);
    await setSelectValue(brandField, brand);
    found = true;
  } catch (e) {
    updateSpinner('selectBrand', `Setting brand to All Brands`);
    await setSelectValue(brandField, 'All Brands');
  }

  await clickSubmit();
  finishSpinner('selectBrand');
  return found;
};

const useSelectSet = (driver, selectBrand) => async (setInfo, foundAction) => {
  showSpinner('selectSet', `${setInfo.skuPrefix}: Selecting Set`);
  const spinner = (message) => updateSpinner('selectSet', `${setInfo.skuPrefix}: ${message}`);
  const selectSet = async (setInfoForRun) => {
    // console.log('search for set', setInfoForRun);
    const setName = `${setInfoForRun.setName} ${setInfoForRun.insert || ''} ${setInfoForRun.parallel || ''}`
      .replace('  ', ' ')
      .trim();
    spinner('selectSet', `Searching for [${setName}]`);
    const sport = { baseball: 'BB', football: 'FB', basketball: 'BK' }[setInfo.sport.toLowerCase()];

    spinner('selectSet', `Searching for ${setInfoForRun.year} ${setName} in ${sport}`);
    const selectDonruss = async () => {
      if (setInfoForRun.setName.startsWith('Donruss')) {
        const donrussManufactured = {
          ...setInfoForRun,
          manufacture: 'Donruss',
          setName: setInfoForRun.setName.replace('Donruss', '').trim(),
        };

        spinner('selectSet', `Searching with Donruss Manufacture`);
        await selectBrand(donrussManufactured);
        return await selectSet(donrussManufactured);
      } else {
        errorSpinner('selectSet', `Could not find ${setInfo.skuPrefix}`);
        setInfoForRun.found = false;
        return setInfoForRun;
      }
    };
    try {
      let found = false;
      await driver.sleep(500);
      // console.log(`Searching for [${setName}]`);
      const rows = await driver.findElements(By.xpath(`//*${caseInsensitive(setName)}`));
      spinner('selectSet', `Found ${rows.length} rows`);
      for (let row of rows) {
        let fullSetText;
        try {
          const link = await row.findElement(By.xpath(`.//a`));
          fullSetText = await link.getText();
        } catch (e) {
          fullSetText = await row.getText();
        }
        // if the fullSetText is numbers followed by a space followed by the value in the  setName variable
        // or if the fullSetText is numbers followed by a space followed by the setName followed by "Base Set"
        const pattern = `^\\d+( ${setInfoForRun.manufacture.toLowerCase()})? ${setName.toLowerCase()}( Base Set)?( ${sport}| ${sport.toLowerCase()})?$`;
        const regex = new RegExp(pattern);
        spinner(`Testing: ${fullSetText.toLowerCase()} against ${pattern}`);
        if (regex.test(fullSetText.toLowerCase())) {
          // console.log('Found: ' + fullSetText);
          foundAction && (await foundAction(fullSetText, row));
          found = true;
        }
      }

      if (!found) {
        return await selectDonruss();
      } else {
        setInfoForRun.found = true;
        finishSpinner('selectSet');
        return setInfoForRun;
      }
    } catch (e) {
      // console.log(e);
      return await selectDonruss();
    }
  };

  return await selectSet(setInfo);
};

let _driver;

export async function login() {
  if (!_driver) {
    showSpinner('login', 'Logging into SportLots');
    _driver = await new Builder().forBrowser(Browser.CHROME).build();
    await _driver.get('https://sportlots.com/cust/custbin/login.tpl?urlval=/index.tpl&qs=');
    const waitForElement = useWaitForElement(_driver);

    updateSpinner('login', 'Looking for username field');
    const signInButton = await waitForElement(By.xpath("//input[@name = 'email_val']"));
    await signInButton.sendKeys(process.env.SPORTLOTS_ID);

    updateSpinner('login', 'Looking for password field');
    const passwordField = await waitForElement(By.xpath("//input[@name = 'psswd']"));
    await passwordField.sendKeys(process.env.SPORTLOTS_PASS);

    updateSpinner('login', 'Submitting login request');
    await useClickSubmit(waitForElement)();
    finishSpinner('login', 'Sportlots Logged In');
  }
  return _driver;
}

export async function shutdownSportLots() {
  showSpinner('shutdown', 'Shutting down SportLots');
  if (_driver) {
    const d = _driver;
    _driver = undefined;
    await d.quit();
  }
  finishSpinner('shutdown', 'Sportlots shutdown complete');
}

async function enterIntoSportLotsWebsite(cardsToUpload) {
  const { update, finish, error } = showSpinner('upload', 'Uploading');
  update('login');
  const driver = await login();

  try {
    update('setup');
    const waitForElement = useWaitForElement(driver);
    const clickSubmit = useClickSubmit(waitForElement);
    const selectBrand = useSelectBrand(driver, 'newinven', 'yr', 'sprt', 'brd');
    const selectSet = useSelectSet(driver, selectBrand);

    for (const key in cardsToUpload) {
      update(key);
      const {
        update: updateSet,
        finish: finishSet,
        error: errorSet,
      } = showSpinner(`upload-${key}`, `Uploading ${key}`);
      updateSet('Get Group Info');
      const setInfo = await getGroupByBin(key);

      if (setInfo.sportlots?.skip) {
        finishSet(`Skipping ${key}`);
        continue;
      }

      if (!setInfo.sportlots) {
        setInfo.sportlots = {};
      }
      let cardsAdded = 0;

      updateSet('Brand');
      await selectBrand(setInfo);
      const onFoundSet = async (fullSetText, row) => {
        const fullSetNumbers = fullSetText.split(' ')[0];
        setInfo.sportlots.id = fullSetNumbers;
        //find the radio button where the value is fullSetNumbers
        const radioButton = await row.findElement(By.xpath(`//input[@value = '${fullSetNumbers}']`));
        await radioButton.click();
      };
      let found = false;
      if (setInfo.sportlots.id) {
        updateSet('Set - id');
        const radioButton = await waitForElement(By.xpath(`//input[@value = '${setInfo.sportlots.id}']`));
        await radioButton.click();
        found = true;
      } else {
        updateSet('Set - lookup');
        found = (await selectSet(setInfo, onFoundSet)).found;
      }
      if (found) {
        updateSet('Update Group');
        await updateGroup(setInfo);
        await clickSubmit();
      } else {
        updateSet('Set - not found');
        const inputYear = setInfo.sportlots.year || setInfo.year;
        const selectedYear = await ask('Year?', inputYear);
        if (selectedYear !== inputYear) {
          setInfo.sportlots.year = selectedYear;
          setInfo.sportlots.manufacture = await ask('Manufacturer?', undefined, {
            selectOptions: Object.values(brands),
          });
          await selectBrand(setInfo);
          found = (await selectSet(setInfo, onFoundSet)).found;
        }
        if (found) {
          await updateGroup(setInfo);
          await clickSubmit();
        } else {
          const tds = await driver.findElements(
            By.xpath(`//input[@type='radio' and @name='selset']/../following-sibling::td`),
          );
          const radioButtonValues = await Promise.all(
            tds.map(async (td) => {
              const buttonText = await td.getText();
              return {
                value: buttonText.split(' ')[0],
                name: buttonText,
              };
            }),
          );

          const fullSetNumbers = await ask('Which set is this?', undefined, { selectOptions: radioButtonValues });

          const radioButton = await waitForElement(By.xpath(`//input[@value = '${fullSetNumbers}']`));
          radioButton.click();
          await clickSubmit();
          found = true;

          setInfo.sportlots.id = fullSetNumbers;
          await updateGroup(setInfo);
        }
      }

      if (found) {
        updateSet('Upload Cards');
        while ((await driver.getCurrentUrl()).includes('listcards.tpl')) {
          const addedCards = [];
          let rows = await driver.findElements({
            css: 'table > tbody > tr:first-child > td:first-child > form > table > tbody > tr',
          });

          let firstCardNumber, lastCardNumber;
          for (let row of rows) {
            // Find the columns of the current row.
            let columns = await row.findElements({ css: 'td' });

            if (columns && columns.length > 1) {
              // Extract the text from the second column.
              let tableCardNumber = await columns[1].getText();
              if (!firstCardNumber) {
                firstCardNumber = Number.parseInt(tableCardNumber);
              }
              lastCardNumber = Number.parseInt(tableCardNumber);

              const card = cardsToUpload[key].find(
                (card) =>
                  card.cardNumber.toString() === tableCardNumber ||
                  (card.card_number_prefix &&
                    card.cardNumber.substring(card.card_number_prefix.length) === tableCardNumber),
              );

              if (card) {
                updateSet(`Adding ${tableCardNumber}`);
                let cardNumberTextBox = await columns[0].findElement({ css: 'input' });
                await cardNumberTextBox.sendKeys(card.quantity);

                const priceTextBox = await columns[3].findElement({ css: 'input' });
                priceTextBox.clear();
                await priceTextBox.sendKeys(card.slPrice);
                addedCards.push(card);
                const binTextBox = await columns[5].findElement({ css: 'input' });
                await binTextBox.sendKeys(card.sku || card.bin);
                updateSet(`Added ${tableCardNumber}`);
              }
            }
          }

          //in the case where 'Skip to Page' exists we know that there are multiple pages, so we should only be counting
          //the cards that fit within the current range. Otherwise, we should be counting all cards.
          updateSet('Validating');
          const skipToPage = await driver.findElements(By.xpath(`//*[contains(text(), 'Skip to Page')]`));
          let expectedCards;
          if (skipToPage.length > 0) {
            expectedCards = Object.values(cardsToUpload[key]).filter((card) => {
              return card.cardNumber >= firstCardNumber && card.cardNumber <= lastCardNumber;
            });
          } else {
            expectedCards = Object.values(cardsToUpload[key]);
          }

          await validateUploaded(expectedCards, addedCards, 'slPrice');

          updateSet('Submit');
          await clickSubmit();
          updateSet('Wait for Results');
          const resultHeader = await driver.wait(
            until.elementLocated(By.xpath(`//h2[contains(text(), 'cards added')]`)),
          );
          const resultText = await resultHeader.getText();
          const cardsAddedText = resultText.match(/(\d+) cards added/);
          if (cardsAddedText) {
            cardsAdded += parseInt(cardsAddedText[0]);
          }
        }
        finishSet(`Added ${cardsAdded} cards to ${key}`);
      } else {
        errorSet(`Could not find ${setInfo.skuPrefix}`);
        await ask('Press any key to continue...');
      }
    }
    finish('Sportlots');
  } catch (e) {
    error(e);
    await ask('Press any key to continue...');
  }
}

export const convertTitleToCard = (title) => {
  const cardNumberIndex = title.indexOf('#');
  const yearIdx = title.match(/\D*-?\D+/)?.index;
  let setInfo = title.slice(yearIdx, cardNumberIndex).trim();
  let setInfoLower = setInfo.toLowerCase();
  const card = {
    cardNumber: title.match(/#(.*\d+)/)?.[1].replaceAll(' ', ''),
    year: title.split(' ')[0],
    parallel: '',
    insert: '',
    sport: { BB: 'Baseball', FB: 'Football', BK: 'Basketball' }[title.slice(-2)],
    title,
  };

  const manufacture = manufactures.find((m) => setInfoLower.indexOf(m) > -1);
  if (manufacture) {
    if (manufacture === 'score') {
      card.manufacture = 'Panini';
    } else {
      card.manufacture = setInfo.slice(setInfoLower.indexOf(manufacture), manufacture.length);
      setInfo = setInfo.replace(card.manufacture, '').trim();
      setInfoLower = setInfo.toLowerCase();
    }
  }

  const set = sets.find((s) => setInfo.toLowerCase().indexOf(s) > -1);
  if (set) {
    card.setName = setInfo.slice(setInfoLower.indexOf(set), set.length);
    setInfo = setInfo.replace(card.setName, '').trim();
    setInfoLower = setInfo.toLowerCase();
  }

  if (setInfoLower.indexOf('base set') === -1) {
    const insertIndex = setInfoLower.indexOf('insert');
    if (insertIndex > -1) {
      card.insert = setInfo.slice(0, insertIndex).trim();
      setInfo = setInfo.replace(card.insert, '').trim();
      setInfoLower = setInfo.toLowerCase();
    }

    const parallelIndex = setInfoLower.indexOf('parallel');
    if (parallelIndex > -1) {
      card.parallel = setInfo.slice(0, parallelIndex).trim();
      setInfo = setInfo.replace(card.parallel, '').trim();
    }

    if (setInfo.length > 0 && setInfo !== 'base') {
      if (!card.setName) {
        card.setName = setInfo;
      } else if (!card.insert) {
        card.insert = setInfo;
      } else {
        card.extraSetInfo = setInfo;
      }
    }
  }

  return card;
};

export function convertBinNumber(binNumber, cardNumberFromTitle) {
  const card = {};
  if (binNumber && conditions.indexOf(binNumber) === -1) {
    if (binNumber?.indexOf('|') > -1) {
      const [bin, cardNumber] = binNumber.split('|');
      card.bin = bin;
      //this is weird, but it accounts for the fact SportLots bin numbers are short so they do not always have the full card number
      if (cardNumberFromTitle?.indexOf(cardNumber) > -1) {
        card.sku = `${bin}|${cardNumberFromTitle}`;
      } else {
        card.sku = binNumber;
      }
    } else {
      card.bin = binNumber;
    }
  }
  return card;
}

export async function getSalesSportLots() {
  showSpinner('sales', 'Getting SportLots Sales');
  const cards = [];
  const driver = await login();
  const waitForElement = useWaitForElement(driver);

  const addCards = async (orderType) => {
    await driver.get(`https://sportlots.com/inven/dealbin/dealacct.tpl?ordertype=${orderType}`);
    //first make sure that the page has loaded
    const wrapper = await waitForElement(By.xpath(`//div[@data-name = 'results body']`));

    const orders = await wrapper.findElements(By.xpath('./div/form'));
    for (let order of orders) {
      const orderNumber = await order.findElement(By.xpath(`./div/a`));
      const orderNumberText = await orderNumber.getText();
      const rows = await order.findElements(By.xpath(`./div[descendant::select]`));
      for (let row of rows) {
        const select = await row.findElement(By.xpath(`.//select`));
        const quantity = await select.getAttribute('value');
        const titleDiv = await driver.executeScript('return arguments[0].nextElementSibling;', row);
        const title = await titleDiv.getText();
        showSpinner(`sales-${orderNumberText}-${title}`, `Found ${title} in order ${orderNumberText}`);
        const binDiv = await driver.executeScript('return arguments[0].nextElementSibling;', titleDiv);
        let bin = await binDiv.getText();
        if (bin === 'N/A') {
          errorSpinner(`sales-${orderNumberText}-${title}`, `${title} had an N/A bin`);
        } else {
          const cardFromTitle = convertTitleToCard(title);
          cards.push({
            platform: `SportLots: ${orderNumberText}`,
            title,
            quantity,
            ...cardFromTitle,
            ...convertBinNumber(bin, cardFromTitle.cardNumber),
          });
          finishSpinner(`sales-${orderNumberText}-${title}`, `${title} x${quantity} sold.`);
        }
      }
    }
  };

  await addCards('1a'); //Fill to Buyer
  await addCards('1b'); //Fill to Box

  await driver.get('https://sportlots.com/s/ui/profile.tpl');

  finishSpinner('sales', `Found ${chalk.green(cards.length)} cards sold on SportLots`);
  return cards;
}

export async function removeFromSportLots(groupedCards) {
  showSpinner('remove', 'Removing Cards from SportLots Listings');

  const toRemove = {};
  let removed = 0;
  const notRemoved = [];
  Object.keys(groupedCards)
    .filter((key) => !groupedCards[key].sportlots?.skip)
    .forEach((key) => {
      const toRemoveAtKey = groupedCards[key].filter((card) => card.platform.indexOf('SportLots') === -1);
      if (toRemoveAtKey?.length > 0) {
        toRemove[key] = toRemoveAtKey;
      }
    });

  if (Object.keys(toRemove).length === 0) {
    finishSpinner('remove', 'No cards to remove from SportLots');
    return;
  } else {
    updateSpinner(
      'remove',
      `Removing ${Object.values(toRemove).reduce((acc, val) => acc + val.length, 0)} cards from SportLots`,
    );
  }

  const driver = await login();
  const waitForElement = useWaitForElement(driver);
  await driver.sleep(500);

  const clickSubmit = useClickSubmit(waitForElement);
  const selectBrand = useSelectBrand(driver, 'updinven', 'year', 'sportx', 'brd');
  const selectSet = useSelectSet(driver, selectBrand);

  for (const key in toRemove) {
    showSpinner(`remove-${key}`, `Removing ${toRemove[key]?.length} cards from [${key}]`);
    let setInfo = await getGroupByBin(key);
    updateSpinner(`remove-${key}`, `Removing ${toRemove[key]?.length} cards from [${setInfo.skuPrefix}]`);
    showSpinner(`remove-${key}-details`, `Removing ${toRemove[key]?.length} cards from [${setInfo.skuPrefix}]`);
    let found = false;
    if (setInfo.sportlots?.id) {
      updateSpinner(`remove-${key}-details`, `Navigating direct to set ${setInfo.sportlots.id}`);
      await driver.get(`https://sportlots.com/inven/dealbin/setdetail.tpl?Set_id=${setInfo.sportlots.id}`);
      found = true;
    } else {
      updateSpinner(`remove-${key}-details`, `Searching for set ${setInfo.skuPrefix}`);
      await selectBrand(setInfo);

      await waitForElement(By.xpath("//*[contains(normalize-space(), 'Dealer Inventory Summary')]"));
      setInfo = await selectSet(setInfo, async (fullSetText, row) => {
        await row.click();
      });
      found = setInfo.found;
    }

    const updateInventoryHeader = By.xpath('//form[@action="/inven/dealbin/updpct.tpl"]');
    try {
      updateSpinner(`remove-${key}-details`, `Waiting for update inventory`);
      await driver.findElement(updateInventoryHeader);
      found = true;
      if (!setInfo.sportlots?.id) {
        const url = await driver.getCurrentUrl();
        setInfo.sportlots = setInfo.sportlots || {};
        setInfo.sportlots.id = url.match(/Set_id=(\d+)/)?.[1];
        if (setInfo.sportlots.id) {
          await updateGroup(setInfo);
        } else {
          throw new Error(`Could not find set id for ${setInfo.skuPrefix} in ${url}`);
        }
      }
      updateSpinner(`remove-${key}-details`, `Found the Update Inventory Page`);
    } catch (e) {
      const find = new Promise((resolve) => {
        let askFail, waitFail;
        pauseSpinners();
        const askPromise = confirm({
          message: `Does this set exist on SportLots? ${chalk.red(key)}. Please select the proper filters or say No`,
        });

        askPromise
          .then((response) => {
            // console.log('ask - then');
            // console.log('resolved ask');
            // console.log('resolved ask');
            resolve(response);
          })
          .catch((e) => {
            // console.log('ask - catch');
            askFail = e;
            if (waitFail) {
              // console.log('askFail', askFail);
              // console.log('waitFail', waitFail);
              // resolve(false);
            }
          });
        waitForElement(updateInventoryHeader)
          .then(() => {
            // console.log('element - then');
            // try {
            askPromise.cancel();
            resolve(true);
            // } catch (e) {
            //   console.log(e);
            // }
          })
          .catch((e) => {
            // console.log('element - catch');
            waitFail = e;
            if (askFail) {
              // console.log('askFail', askFail);
              // console.log('waitFail', waitFail);
              resolve(false);
            }
          });
      });
      found = await find;
      resumeSpinners();
    }

    if (found) {
      updateSpinner(`remove-${key}-details`, `Found set; removing items`);
      if (!setInfo.sportlots?.id) {
        updateSpinner(`remove-${key}-details`, `Adding Set to Firebase`);
        const slInfo = setInfo.sportlots || {};
        const url = await driver.getCurrentUrl();
        slInfo.bin = url.match(/Set_id=(\d+)/)?.[1];
        setInfo.sportlots = slInfo;
        await updateGroup(setInfo);
        updateSpinner(`remove-${key}-details`, `Removing items`);
      }

      for (const card of toRemove[key]) {
        showSpinner(`remove-card-${card.cardNumber}`, `${card.title}`);
        //find a td that contains card.cardNumber
        let tdWithName;
        try {
          updateSpinner(`remove-card-${card.cardNumber}`, `${card.title}: Looking for ${card.cardNumber}`);
          tdWithName = await driver.findElement(By.xpath(`//td[contains(text(), ' ${card.cardNumber} ')]`));
        } catch (e) {
          // remove all non-numeric characters from the card number and try again
          const cardNumber = card.cardNumber.replace(/\D/g, '');
          updateSpinner(`remove-card-${card.cardNumber}`, `${card.title}: Trying card Number ${card.cardNumber}`);
          try {
            tdWithName = await driver.findElement(By.xpath(`//td[contains(text(), ' ${cardNumber} ')]`));
          } catch (e) {
            errorSpinner(`remove-card-${card.cardNumber}`, `Could not find card ${card.title}`);
          }
        }
        if (tdWithName) {
          updateSpinner(`remove-card-${card.cardNumber}`, `${card.title}: Looking for parent row`);
          const row = await tdWithName.findElement(By.xpath('..'));
          //set the row background to yellow
          await driver.executeScript("arguments[0].style.backgroundColor = 'yellow';", row);
          updateSpinner(`remove-card-${card.cardNumber}`, `${card.title}: Looking current quantity`);
          try {
            let cardNumberTextBox = await row.findElement(By.xpath(`./td/input[starts-with(@name, 'qty')]`));
            const currentQuantity = await cardNumberTextBox.getAttribute('value');
            let newQuantity = parseInt(currentQuantity) - parseInt(card.quantity);
            if (newQuantity < 0) {
              newQuantity = 0;
            }

            updateSpinner(`remove-card-${card.cardNumber}`, `${card.title}: Updating quantity to: ${newQuantity}`);
            await cardNumberTextBox.clear();
            await cardNumberTextBox.sendKeys(newQuantity);
            removed++;
            finishSpinner(`remove-card-${card.cardNumber}`, `${card.title} now has ${newQuantity} cards remaining`);
          } catch (e) {
            errorSpinner(`remove-card-${card.cardNumber}`, `Could not find card ${card.title}`);
            await ask(`Please reduce quantity by ${chalk.red(card.quantity)} and Press any key to continue...`);
          }
        } else {
          errorSpinner(`remove-card-${card.cardNumber}`, `Could not find card ${card.title}`);
          await ask(`Please reduce quantity by ${chalk.red(card.quantity)} and Press any key to continue...`);
        }
      }
      updateSpinner(`remove-${key}-details`, `Submitting changes`);
      await clickSubmit('Change Dealer Values');
      finishSpinner(`remove-${key}-details`);
      finishSpinner(`remove-${key}`);
    } else {
      finishSpinner(`remove-${key}-details`);
      finishSpinner(`remove-${key}`);
      // errorSpinner(`remove-${key}`, `Could not find ${setInfo.skuPrefix} on SportLots`);
    }
  }
  //
  // await clickSubmit();

  const expected = Object.values(toRemove).reduce((acc, val) => acc + val.length, 0);
  if (removed === expected) {
    finishSpinner('remove', `Successfully removed all ${removed} cards from SportLots`);
  } else {
    errorSpinner('remove', `Only removed ${removed} of ${expected} cards from SportLots`);
    // console.log(
    //   chalkTable(
    //     {
    //       leftPad: 2,
    //       columns: [
    //         { field: 'title', name: 'Title' },
    //         { field: 'quantity', name: 'Sold' },
    //         { field: 'updatedQuantity', name: 'Remaining' },
    //         { field: 'error', name: 'Error' },
    //       ],
    //     },
    //     notRemoved,
    //   ),
    // );
  }
}

export default enterIntoSportLotsWebsite;

const setCache = {};

export async function findSetId(defaultValues = {}) {
  const { update, finish } = showSpinner('setInfo', 'Find SetInfo');
  let setInfo = {};
  const driver = await login();
  const waitForElement = useWaitForElement(driver);
  const clickSubmit = useClickSubmit(waitForElement);
  const setSelectValue = useSetSelectValue(driver);

  await driver.get(`https://sportlots.com/inven/dealbin/newinven.tpl`);

  const getAndSetValue = async (text, name, defaultValue, returnName = false) => {
    const sportSelector = await waitForElement(By.name(name));
    const sportOptions = await getSelectOptions(sportSelector);
    const sport = await ask(text, defaultValue, { selectOptions: sportOptions });
    await setSelectValue(sportSelector, sport);
    if (returnName) {
      return sportOptions.find((option) => option.value === sport)?.name.toLowerCase();
    } else {
      return sport;
    }
  };

  setInfo.sport = await getAndSetValue('Sport', 'sprt', defaultValues.sport, true);
  update(JSON.stringify(setInfo));
  if (!setCache[setInfo.sport]) {
    setCache[setInfo.sport] = {};
  }
  setInfo.year = await getAndSetValue('Year', 'yr', defaultValues.year);
  update(JSON.stringify(setInfo));
  if (!setCache[setInfo.sport][setInfo.year]) {
    setCache[setInfo.sport][setInfo.year] = {};
  }
  setInfo.manufacture = await getAndSetValue('Manufacture', 'brd', defaultValues.manufacture);
  update(JSON.stringify(setInfo));

  await clickSubmit();
  let allSets = [];
  if (!setCache[setInfo.sport][setInfo.year][setInfo.manufacture]) {
    //find the table and iterate through the rows
    const table = await waitForElement(By.xpath(`//th[contains(text(), 'Set Name')]`));
    const rows = await table.findElements(By.xpath(`../../tr`));
    for (let row of rows) {
      const columns = await row.findElements(By.xpath(`./td`));
      if (columns.length > 1) {
        const fullSetText = await columns[1].getText();
        allSets.push(fullSetText.replace('Base Set', '').trim());
      }
    }

    setCache[setInfo.sport][setInfo.year][setInfo.manufacture] = allSets.sort();
  } else {
    allSets = setCache[setInfo.sport][setInfo.year][setInfo.manufacture];
  }

  const sets = {};
  let lastSet;
  let lastInsert;
  for (let i = 0; i < allSets.length; i++) {
    const fullSetText = allSets[i];
    const setNumber = fullSetText.substring(0, fullSetText.indexOf(' '));
    const setText = fullSetText.substring(fullSetText.indexOf(' ') + 1);
    let setName = setText;
    if (!lastSet) {
      lastSet = setName;
      sets[setName] = {
        base: { name: setText, value: { sportlots: { bin: setNumber }, setName: setName }, description: fullSetText },
        inserts: {},
        parallels: [],
      };
    } else {
      if (
        setText.indexOf(lastSet) > -1 &&
        !(setText === `${lastSet} Draft Picks` && allSets[i + 1].indexOf(`${lastSet} Draft Picks`) > -1)
      ) {
        setName = lastSet;
        const nextInsert = setText.replace(setName, '').trim();
        if (!lastInsert || nextInsert.indexOf(lastInsert) === -1 || nextInsert.length < lastInsert.length) {
          lastInsert = nextInsert;
          if (allSets[i + 1] && allSets[i + 1].indexOf(lastInsert) > -1) {
            sets[setName].inserts[lastInsert] = {
              base: {
                name: setText,
                value: { sportlots: { bin: setNumber }, setName: setName, insert: lastInsert },
                description: fullSetText,
              },
              parallels: [],
            };
          } else {
            sets[setName].parallels.push({
              name: setText,
              value: { sportlots: { bin: setNumber }, setName: setName, parallel: lastInsert },
              description: fullSetText,
            });
          }
        } else {
          sets[setName].inserts[lastInsert].parallels.push({
            name: setText,
            value: {
              sportlots: { bin: setNumber },
              setName: setName,
              insert: lastInsert,
              parallel: setText.replace(setName, '').replace(lastInsert, '').trim(),
            },
            description: fullSetText,
          });
        }
      } else {
        lastSet = setName;
        lastInsert = undefined;
        sets[setName] = {
          base: { name: setText, value: { sportlots: { bin: setNumber }, setName: setName }, description: fullSetText },
          inserts: {},
          parallels: [],
        };
      }
    }
  }

  const none = { name: 'None', value: { setName: 'None', insert: 'None', parallel: 'None' } };
  setInfo.setName = await ask('Which set is this?', defaultValues.setName, {
    selectOptions: ['None', ...Object.keys(sets)],
  });
  if (setInfo.setName !== 'None') {
    const setType = await ask('Which type is this?', undefined, { selectOptions: ['base', 'insert', 'parallel'] });
    if (setType === 'base') {
      setInfo = {
        ...setInfo,
        ...sets[setInfo.setName].base.value,
      };
    } else if (setType === 'insert') {
      const insert = await ask('Which insert is this?', defaultValues.insert, {
        selectOptions: ['None', ...Object.keys(sets[setInfo.setName].inserts)],
      });
      if (insert === 'None') {
        setInfo = {
          ...setInfo,
          ...(await ask('Which parallel is this?', defaultValues.parallel, {
            selectOptions: [none, sets[setInfo.setName].base, ...sets[setInfo.setName].parallels],
          })),
        };
      } else {
        let parallel;
        if (sets[setInfo.setName].inserts[insert].parallels.length > 0) {
          parallel = await ask('Which parallel is this?', defaultValues.parallel, {
            selectOptions: [
              { name: 'None', value: undefined },
              sets[setInfo.setName].inserts[insert].base,
              ...sets[setInfo.setName].inserts[insert].parallels,
            ],
          });
        }
        if (parallel) {
          setInfo = {
            ...setInfo,
            ...parallel,
          };
        } else {
          setInfo = {
            ...setInfo,
            ...sets[setInfo.setName].inserts[insert].base.value,
          };
        }
      }
    } else {
      setInfo = {
        ...setInfo,
        ...(await ask('Which parallel is this?', defaultValues.parallel, {
          selectOptions: [none, sets[setInfo.setName].base, ...sets[setInfo.setName].parallels],
        })),
      };
    }
  }

  if (setInfo.setName === 'None' || setInfo.insert === 'None' || setInfo.parallel === 'None') {
    const tryAgain = await ask('Could not find set. Try again?', true);
    if (tryAgain) {
      setInfo = await findSetId(setInfo);
    } else if (setInfo.setName !== 'None' && setInfo.bin) {
      const clearInsert = await ask('Clear Insert?', true);
      if (clearInsert) {
        setInfo.insert = undefined;
      }
      const clearParallel = await ask('Clear Parallel?', true);
      if (clearParallel) {
        setInfo.parallel = undefined;
      }
    } else {
      setInfo = {
        sportlots: {
          skip: true,
        },
      };
    }
  }

  finish(`Selected Set Info ${JSON.stringify(setInfo)}`);
  return setInfo;
}
