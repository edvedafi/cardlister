import { manufactures, sets } from '../utils/data.js';
import { Browser, Builder, By, until, Select } from 'selenium-webdriver';
import { ask } from '../utils/ask.js';
import { parseKey, useSetSelectValue, useWaitForElement, waitForElement } from './uploads.js';
import { validateUploaded } from './validate.js';
import chalk from 'chalk';

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
    await setSelectValue(yearField, setInfo.year);
    await setSelectValue(brandField, brands[setInfo.setName?.toLowerCase()] || setInfo.manufacture);
    found = true;
  } catch (e) {
    await setSelectValue(brandField, 'All Brands');
  }

  await clickSubmit();
  return found;
};

const useSelectSet = (driver, selectBrand) => async (setInfo, foundAction) => {
  const selectSet = async (setInfoForRun) => {
    const setName = `${setInfoForRun.setName} ${setInfoForRun.insert || ''} ${setInfoForRun.parallel || ''}`
      .replace('  ', ' ')
      .trim();
    const sport = { baseball: 'BB', football: 'FB', basketball: 'BK' }[setInfo.sport.toLowerCase()];

    const selectDonrus = async () => {
      if (setInfoForRun.setName.startsWith('Donruss')) {
        const donrussManufactured = {
          ...setInfoForRun,
          manufacture: 'Donruss',
          setName: setInfoForRun.setName.replace('Donruss', '').trim(),
        };
        await selectBrand(donrussManufactured);
        return await selectSet(donrussManufactured);
      } else {
        console.log(`Please select [${setInfo.manufacture} ${setName}]`);
        setInfoForRun.found = false;
        return setInfoForRun;
      }
    };
    try {
      let found = false;
      const rows = await driver.findElements(By.xpath(`//*[contains(text(), '${setName}')]`));
      for (let row of rows) {
        const fullSetText = await row.getText();
        // if the fullSetText is numbers followed by a space followed by the value in the  setName variable
        // or if the fullSetText is numbers followed by a space followed by the setName followed by "Base Set"
        const regex = new RegExp(`^\\d+( ${setInfoForRun.manufacture})? ${setName}( Base Set)?( ${sport})?$`);
        // console.log('Testing: ' + fullSetText + ' against ' + regex);
        if (regex.test(fullSetText)) {
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
      console.log(e);
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
    await _driver.quit();
  }
}

async function enterIntoSportLotsWebsite(cardsToUpload) {
  console.log(chalk.magenta('SportLots Starting Upload'));
  console.log('Uploading:', Object.keys(cardsToUpload));
  let driver;

  try {
    driver = await new Builder().forBrowser(Browser.CHROME).build();

    const waitForElement = useWaitForElement(driver);
    const clickSubmit = useClickSubmit(waitForElement);
    // const setSelectValue = useS
    const selectBrand = useSelectBrand(driver, 'newinven', 'yr', 'sprt', 'brd');
    const selectSet = useSelectSet(driver, selectBrand);

    for (const key in cardsToUpload) {
      const setInfo = parseKey(key);
      let cardsAdded = 0;

      await selectBrand(setInfo);
      let { found } = await selectSet(setInfo, async (fullSetText, row) => {
        const fullSetNumbers = fullSetText.split(' ')[0];
        //find the radio button where the value is fullSetNumbers
        const radioButton = await row.findElement(By.xpath(`//input[@value = '${fullSetNumbers}']`)); // TODO needs different on updates
        await radioButton.click();
      });
      if (found) {
        await clickSubmit();
      } else {
        found = await ask(
          `Does this set exist on SportLots? ${JSON.stringify(
            setInfo,
            null,
            2,
          )}. Please select the proper filters and hit enter or say No`,
          true,
        );
        if (found) {
          await clickSubmit();
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
      }
    }
    console.log(chalk.magenta('SportLots Completed Upload!'));
  } catch (e) {
    console.log(chalk.red('Failed to upload to SportLots'));
    console.log(e);
    await ask('Press any key to continue...');
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
}

export const convertTitleToCard = (title) => {
  const cardNumberIndex = title.indexOf('#');
  const yearIdx = title.match(/\D*-?\D+/)?.index;
  let setInfo = title.slice(yearIdx, cardNumberIndex).trim();
  let setInfoLower = setInfo.toLowerCase();
  const card = {
    cardNumber: title.match(/#(\S+)\s/)?.[1],
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
  }

  console.log(chalk.magenta('Found'), chalk.green(cards.length), chalk.magenta('cards sold on SportLots'));
  return cards;
}
export async function removeFromSportLots(groupedCards) {
  console.log(chalk.magenta('Removing Cards from SportLots Listings'));

  const toRemove = {};
  let removed = 0;
  Object.keys(groupedCards).forEach((key) => {
    const toRemoveAtKey = groupedCards[key].filter((card) => card.platform.indexOf('SportLots') === -1);
    if (toRemoveAtKey?.length > 0) {
      toRemove[key] = toRemoveAtKey;
    }
  });
  console.log('Removing:', JSON.stringify(toRemove, null, 2));

  const driver = await login();
  const waitForElement = useWaitForElement(driver);
  await driver.sleep(500);

  const clickSubmit = useClickSubmit(waitForElement);
  const selectBrand = useSelectBrand(driver, 'updinven', 'year', 'sportx', 'brd');
  const selectSet = useSelectSet(driver, selectBrand);

  for (const key in groupedCards) {
    console.log(`Removing ${chalk.green(toRemove[key]?.length)} cards from ${chalk.cyan(key)}`);
    let setInfo = parseKey(key);
    const setExists = await selectBrand(setInfo);

    await waitForElement(By.xpath("//*[contains(normalize-space(), 'Dealer Inventory Summary')]"));
    setInfo = await selectSet(setInfo, async (fullSetText, row) => {
      await row.click();
    });

    let found = setInfo.found;

    if (found) {
      await waitForElement(By.xpath(`//*[contains(normalize-space(), 'Update Inventory')]`));
    } else {
      found = await Promise.any([
        await ask(
          `Does this set exist on SportLots? ${chalk.red(
            key,
          )}. Please select the proper filters and hit enter or say No`,
          true,
        ),
        await waitForElement(By.xpath(`//*[contains(normalize-space(), 'Update Inventory')]`)),
      ]);
    }

    if (found) {
      for (const card of toRemove[key]) {
        // console.log('    Attempting to remove', card.title);
        //find a td that contains card.cardNumber
        let tdWithName;
        try {
          tdWithName = await driver.findElement(By.xpath(`//td[contains(text(), ' ${card.cardNumber} ')]`));
        } catch (e) {
          // console.log('*** looking for ', `//td[contains(text(), ' ${card.cardNumber.replace(/\D*/, '').trim()} ')]`);
          try {
            tdWithName = await driver.findElement(
              By.xpath(`//td[contains(text(), ' ${card.cardNumber.replace(/\D*/, '').trim()} ')]`),
            );
          } catch (e) {}
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
