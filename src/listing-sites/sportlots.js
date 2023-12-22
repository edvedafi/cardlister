import { manufactures, sets } from '../utils/data.js';
import { Browser, Builder, By, until, Select } from 'selenium-webdriver';
import { ask } from '../utils/ask.js';
import { caseInsensitive, useSetSelectValue, useWaitForElement } from './uploads.js';
import { validateUploaded } from './validate.js';
import chalk from 'chalk';
import { confirm } from '@inquirer/prompts';
import { getGroupByBin, updateGroup } from './firebase.js';

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

const useClickSubmit =
  (waitForElement) =>
  async (text = undefined) => {
    const submitButton = text
      ? await waitForElement(By.xpath(`//input[(@type = 'submit' or @type = 'Submit') and @value='${text}']`))
      : await waitForElement(By.xpath("//input[@type = 'submit' or @type = 'Submit']"));
    await submitButton.click();
  };

const useSelectBrand = (driver, inventoryURL, yearField, sportField, brandField) => async (setInfo) => {
  const waitForElement = useWaitForElement(driver);
  const clickSubmit = useClickSubmit(waitForElement);
  const setSelectValue = useSetSelectValue(driver);

  await driver.get(`https://sportlots.com/inven/dealbin/${inventoryURL}.tpl`);

  let found = false;

  try {
    await setSelectValue(sportField, { baseball: 'BB', football: 'FB', basketball: 'BK' }[setInfo.sport.toLowerCase()]);
    console.log('setInfo.sportlots?.year', setInfo.sportlots?.year);
    console.log('setting year to', setInfo.sportlots?.year || setInfo.year);
    await setSelectValue(yearField, setInfo.sportlots?.year || setInfo.year);
    await setSelectValue(
      brandField,
      setInfo.sportlots?.manufacture ||
        brands[setInfo.setName?.toLowerCase()] ||
        brands[setInfo.manufacture?.toLowerCase()] ||
        'All Brands',
    );
    found = true;
  } catch (e) {
    await setSelectValue(brandField, 'All Brands');
  }

  await clickSubmit();
  return found;
};

const useSelectSet = (driver, selectBrand) => async (setInfo, foundAction) => {
  const selectSet = async (setInfoForRun) => {
    console.log('search for set', setInfoForRun);
    const setName = `${setInfoForRun.setName} ${setInfoForRun.insert || ''} ${setInfoForRun.parallel || ''}`
      .replace('  ', ' ')
      .trim();
    const sport = { baseball: 'BB', football: 'FB', basketball: 'BK' }[setInfo.sport.toLowerCase()];

    const selectDonrus = async () => {
      console.log('search for special', setInfoForRun);
      if (setInfoForRun.setName.startsWith('Donruss')) {
        const donrussManufactured = {
          ...setInfoForRun,
          manufacture: 'Donruss',
          setName: setInfoForRun.setName.replace('Donruss', '').trim(),
        };
        await selectBrand(donrussManufactured);
        return await selectSet(donrussManufactured);
      } else {
        // console.log(`Please select [${setInfo.manufacture} ${setName}]`);
        setInfoForRun.found = false;
        return setInfoForRun;
      }
    };
    try {
      let found = false;
      await driver.sleep(500);
      console.log(`Searching for [${setName}]`);
      const rows = await driver.findElements(By.xpath(`//*${caseInsensitive(setName)}`));
      for (let row of rows) {
        const fullSetText = await row.getText();
        // if the fullSetText is numbers followed by a space followed by the value in the  setName variable
        // or if the fullSetText is numbers followed by a space followed by the setName followed by "Base Set"
        const regex = new RegExp(
          `^\\d+( ${setInfoForRun.manufacture.toLowerCase()})? ${setName.toLowerCase()}( Base Set)?( ${sport})?$`,
        );
        // console.log('Testing: ' + fullSetText + ' against ' + regex);
        if (regex.test(fullSetText.toLowerCase())) {
          // console.log('Found: ' + fullSetText);
          foundAction && (await foundAction(fullSetText, row));
          found = true;
        }
      }

      if (!found) {
        return await selectDonrus();
      } else {
        setInfoForRun.found = true;
        return setInfoForRun;
      }
    } catch (e) {
      // console.log(e);
      return await selectDonrus();
    }
  };

  return await selectSet(setInfo);
};

let _driver;
async function login() {
  // console.log('before', _driver);
  if (!_driver) {
    // console.log('logging in');
    _driver = await new Builder().forBrowser(Browser.CHROME).build();
    await _driver.get('https://sportlots.com/cust/custbin/login.tpl?urlval=/index.tpl&qs=');
    const waitForElement = useWaitForElement(_driver);

    const signInButton = await waitForElement(By.xpath("//input[@name = 'email_val']"));
    await signInButton.sendKeys(process.env.SPORTLOTS_ID);

    const passwordField = await waitForElement(By.xpath("//input[@name = 'psswd']"));
    await passwordField.sendKeys(process.env.SPORTLOTS_PASS);

    await useClickSubmit(waitForElement)();
  }
  // console.log('after', _driver);
  return _driver;
}

export async function shutdownSportLots() {
  if (_driver) {
    const d = _driver;
    _driver = undefined;
    await d.quit();
  }
}

async function enterIntoSportLotsWebsite(cardsToUpload) {
  console.log(chalk.magenta('SportLots Starting Upload'));
  console.log('Uploading:', Object.keys(cardsToUpload));
  const driver = await login();

  try {
    const waitForElement = useWaitForElement(driver);
    const clickSubmit = useClickSubmit(waitForElement);
    // const setSelectValue = useS
    const selectBrand = useSelectBrand(driver, 'newinven', 'yr', 'sprt', 'brd');
    const selectSet = useSelectSet(driver, selectBrand);

    for (const key in cardsToUpload) {
      const setInfo = await getGroupByBin(key);
      if (!setInfo.sportlots) {
        setInfo.sportlots = {};
      }
      let cardsAdded = 0;

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
        const radioButton = await waitForElement(By.xpath(`//input[@value = '${setInfo.sportlots.id}']`));
        await radioButton.click();
        found = true;
      } else {
        found = (await selectSet(setInfo, onFoundSet)).found;
      }
      if (found) {
        await updateGroup(setInfo);
        await clickSubmit();
      } else {
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
                // console.log("uploading: ", card);
                let cardNumberTextBox = await columns[0].findElement({ css: 'input' });
                await cardNumberTextBox.sendKeys(card.quantity);

                const priceTextBox = await columns[3].findElement({ css: 'input' });
                priceTextBox.clear();
                await priceTextBox.sendKeys(card.slPrice);
                addedCards.push(card);
                const binTextBox = await columns[5].findElement({ css: 'input' });
                await binTextBox.sendKeys(card.sku || card.bin);
                console.log(`Added Card ${chalk.green(tableCardNumber)}`);
              } else {
                // console.log(`Card ${chalk.red(tableCardNumber)} not found`);
              }
            }
          }

          //in the case where 'Skip to Page' exists we know that there are multiple pages, so we should only be counting
          //the cards that fit within the current range. Otherwise, we should be counting all cards.
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

          await clickSubmit();
          const resultHeader = await driver.wait(
            until.elementLocated(By.xpath(`//h2[contains(text(), 'cards added')]`)),
          );
          const resultText = await resultHeader.getText();
          const cardsAddedText = resultText.match(/(\d+) cards added/);
          if (cardsAddedText) {
            cardsAdded += parseInt(cardsAddedText[0]);
          }
        }
        console.log(`${chalk.green(cardsAdded)} cards added to Sportlots at ${chalk.cyan(key)}`);
      } else {
        console.log(`Could not find ${chalk.red(key)} on SportLots`);
        await ask('Press any key to continue...');
      }
    }
    console.log(chalk.magenta('SportLots Completed Upload!'));
  } catch (e) {
    console.log(chalk.red('Failed to upload to SportLots'));
    console.log(e);
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

export async function getSalesSportLots() {
  console.log(chalk.magenta('Gathering SportLots Sales'));
  const cards = [];
  const driver = await login();
  const waitForElement = useWaitForElement(driver);
  await driver.get('https://sportlots.com/inven/dealbin/dealacct.tpl?ordertype=1a');

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
      cards.push({
        platform: `SportLots: ${orderNumberText}`,
        title,
        quantity,
        ...convertTitleToCard(title),
      });
    }

    await driver.get('https://sportlots.com/s/ui/profile.tpl');
  }

  console.log(chalk.magenta('Found'), chalk.green(cards.length), chalk.magenta('cards sold on SportLots'));
  return cards;
}
export async function removeFromSportLots(groupedCards) {
  console.log(chalk.magenta('Removing Cards from SportLots Listings'));

  const toRemove = {};
  let removed = 0;
  const notRemoved = [];
  Object.keys(groupedCards).forEach((key) => {
    const toRemoveAtKey = groupedCards[key].filter((card) => card.platform.indexOf('SportLots') === -1);
    if (toRemoveAtKey?.length > 0) {
      toRemove[key] = toRemoveAtKey;
    }
  });
  // console.log('Removing:', JSON.stringify(toRemove, null, 2));

  const driver = await login();
  const waitForElement = useWaitForElement(driver);
  await driver.sleep(500);

  const clickSubmit = useClickSubmit(waitForElement);
  const selectBrand = useSelectBrand(driver, 'updinven', 'year', 'sportx', 'brd');
  const selectSet = useSelectSet(driver, selectBrand);

  for (const key in toRemove) {
    console.log('key', key);
    let setInfo = await getGroupByBin(key);
    console.log(`Removing ${chalk.green(toRemove[key]?.length)} cards from ${chalk.cyan(setInfo.skuPrefix)}`);
    let found = false;
    if (setInfo.sportlots?.id) {
      await driver.get(`https://sportlots.com/inven/dealbin/setdetail.tpl?Set_id=${setInfo.sportlots.id}`);
      found = true;
    } else {
      await selectBrand(setInfo);

      await waitForElement(By.xpath("//*[contains(normalize-space(), 'Dealer Inventory Summary')]"));
      setInfo = await selectSet(setInfo, async (fullSetText, row) => {
        await row.click();
      });

      found = setInfo.found;
    }

    const updateInventoryHeader = By.xpath('//h2/*[contains(text(), "Update Inventory")]');
    try {
      await driver.findElement(updateInventoryHeader);
      found = true;
      console.log('found update inventory');
    } catch (e) {
      const find = new Promise((resolve) => {
        let askFail, waitFail;

        const askPromise = confirm({
          message: `Does this set exist on SportLots? ${chalk.red(
            key,
          )}. Please select the proper filters and hit enter or say No`,
        });

        askPromise
          .then((found) => {
            // console.log('ask - then');
            // console.log('resolved ask');
            // console.log('resolved ask');
            resolve(true);
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
    }

    if (found) {
      for (const card of toRemove[key]) {
        // console.log('    Attempting to remove', card.title);
        //find a td that contains card.cardNumber
        let tdWithName;
        try {
          tdWithName = await driver.findElement(By.xpath(`//td[contains(text(), ' ${card.cardNumber} ')]`));
        } catch (e) {
          // remove all non-numeric characters from the card number and try again
          const cardNumber = card.cardNumber.replace(/\D/g, '');

          console.log('*** looking for ', `//td[contains(text(), ' ${cardNumber} ')]`);
          try {
            tdWithName = await driver.findElement(By.xpath(`//td[contains(text(), ' ${cardNumber} ')]`));
          } catch (e) {
            console.log('could not find element', e);
          }
        }
        if (tdWithName) {
          const row = await tdWithName.findElement(By.xpath('..'));
          //set the row background to yellow
          await driver.executeScript("arguments[0].style.backgroundColor = 'yellow';", row);
          let cardNumberTextBox = await row.findElement(By.xpath(`./td/input[starts-with(@name, 'qty')]`));
          const currentQuantity = await cardNumberTextBox.getAttribute('value');
          let newQuantity = parseInt(currentQuantity) - parseInt(card.quantity);
          if (newQuantity < 0) {
            newQuantity = 0;
          }
          await cardNumberTextBox.clear();
          await cardNumberTextBox.sendKeys(newQuantity);
          removed++;
          console.log(`Removed card ${chalk.green(card.title)}`);
        } else {
          await ask(
            `Could not find card ${chalk.red(card.title)} in SportLots. Please reduce quantity by ${chalk.red(
              card.quantity,
            )} and Press any key to continue...`,
          );
        }
      }
      await clickSubmit('Change Dealer Values');
    } else {
      throw new Error('Could not find set');
    }
  }

  await clickSubmit();

  const expected = Object.values(toRemove).reduce((acc, val) => acc + val.length, 0);
  if (removed === expected) {
    console.log(chalk.magenta('Successfully removed all'), chalk.green(removed), chalk.magenta('cards from SportLots'));
  } else {
    console.log(
      chalk.magenta('Only removed'),
      chalk.red(removed),
      chalk.magenta('of'),
      chalk.red(expected),
      chalk.magenta('cards from SportLots'),
    );
  }
}

export default enterIntoSportLotsWebsite;
