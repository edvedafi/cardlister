import { byCardNumber, manufactures, sets } from '../utils/data.js';
import { Browser, Builder, By, until, Select } from 'selenium-webdriver';
import { ask, validateAllUploaded } from '../utils/ask.js';
import chalkTable from 'chalk-table';
import { parseKey, useWaitForElement, waitForElement } from './uploads.js';
import { validateUploaded } from './validate.js';
import chalk from 'chalk';
import open from 'open';

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

const useClickSubmit = (waitForElement) => async () => {
  const submitButton = await waitForElement(By.xpath("//input[@type = 'submit']"));
  await submitButton.click();
};
const useSelectValue = (waitForElement) => async (name, value) => {
  const brandSelector = await waitForElement(By.name(name));
  let brandSelectorSelect = new Select(brandSelector);
  await brandSelectorSelect.selectByValue('' + value);
};

async function login() {
  const driver = await new Builder().forBrowser(Browser.CHROME).build();
  await driver.get('https://sportlots.com/cust/custbin/login.tpl?urlval=/index.tpl&qs=');
  const waitForElement = useWaitForElement(driver);

  const signInButton = await waitForElement(By.xpath("//input[@name = 'email_val']"));
  await signInButton.sendKeys(process.env.SPORTLOTS_ID);

  const passwordField = await waitForElement(By.xpath("//input[@name = 'psswd']"));
  await passwordField.sendKeys(process.env.SPORTLOTS_PASS);

  await useClickSubmit(waitForElement)();
  return driver;
}

async function enterIntoSportLotsWebsite(cardsToUpload) {
  console.log(chalk.magenta('SportLots Starting Upload'));
  console.log('Uploading:', Object.keys(cardsToUpload));
  let driver;
  let totalCardsAdded = 0;

  try {
    driver = await new Builder().forBrowser(Browser.CHROME).build();

    const waitForElement = useWaitForElement(driver);
    const clickSubmit = useClickSubmit(waitForElement);
    const setSelectValue = useSelectValue(waitForElement);

    for (const key in cardsToUpload) {
      const setInfo = parseKey(key);
      let cardsAdded = 0;

      const selectBrand = async (year, sport, brand) => {
        await driver.get('https://sportlots.com/inven/dealbin/newinven.tpl');
        try {
          await setSelectValue('yr', year);
          await setSelectValue('sprt', { baseball: 'BB', football: 'FB', basketball: 'BK' }[sport.toLowerCase()]);
          await setSelectValue('brd', brand);
        } catch (e) {
          await setSelectValue('brd', 'All Brands');
          await ask(`Please select the proper filters and then Press any key to continue...`);
        }
        await clickSubmit();
      };

      const selectSet = async (setName) => {
        try {
          let found = false;
          const rows = await driver.findElements(By.xpath(`//*[contains(text(), '${setName}')]`));
          // console.log("rows", rows.length);
          for (let row of rows) {
            const fullSetText = await row.getText();
            // if the fullSetText is numbers followed by a space followed by the value in the  setName variable
            // or if the fullSetText is numbers followed by a space followed by the setName followed by "Base Set"
            const regex = new RegExp(`^\\d+( ${setInfo.manufacture})? ${setName}( Base Set)?$`);
            // console.log("Testing: " + fullSetText + " against " + regex);
            if (regex.test(fullSetText)) {
              const fullSetNumbers = fullSetText.split(' ')[0];
              //find the radio button where the value is fullSetNumbers
              const radioButton = await driver.findElement(By.xpath(`//input[@value = '${fullSetNumbers}']`));
              await radioButton.click();
              found = true;
            }
          }

          if (!found) {
            if (setName.startsWith('Donruss')) {
              await selectBrand(setInfo.year, setInfo.sport, 'Donruss');
              await selectSet(setName.replace('Donruss', '').trim());
            } else {
              await ask(`Please select [${setInfo.manufacture} ${setName}] and then Press any key to continue...`);
            }
          }

          await clickSubmit();
        } catch (e) {
          if (setName.startsWith('Donruss')) {
            await selectBrand(setInfo.year, setInfo.sport, 'Donruss');
            await selectSet(setName.replace('Donruss', '').trim());
          } else {
            await ask(`Please select [${setInfo.manufacture} ${setName}] and then Press any key to continue...`);
            await clickSubmit();
          }
        }
      };

      await selectBrand(setInfo.year, setInfo.sport, brands[setInfo.setName?.toLowerCase()] || setInfo.manufacture);
      await driver.wait(until.urlContains('dealsets.tpl'));
      await selectSet(`${setInfo.setName} ${setInfo.insert || ''} ${setInfo.parallel || ''}`.trim());

      while ((await driver.getCurrentUrl()).includes('listcards.tpl')) {
        let pageAdds = 0;
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
              pageAdds++;
              addedCards.push(card);
              console.log(`Added Card ${chalk.green(tableCardNumber)}`);
            } else {
              // console.log(`Card ${chalk.red(tableCardNumber)} not found`);
            }
          }
        }

        //in the case where 'Skip to Page' exists we know that there are multiple pages so we should only be counting
        //the cards that fit within the current range. Otherwise we should be counting all cards.
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
        const resultHeader = await driver.wait(until.elementLocated(By.xpath(`//h2[contains(text(), 'cards added')]`)));
        const resultText = await resultHeader.getText();
        const cardsAddedText = resultText.match(/(\d+) cards added/);
        if (cardsAddedText) {
          cardsAdded += parseInt(cardsAddedText[0]);
        }
      }

      console.log(`${chalk.green(cardsAdded)} cards added to Sportlots at ${chalk.cyan(key)}`);
      totalCardsAdded += cardsAdded;
      console.log(chalk.magenta('SportLots Completed Upload!'));
    }
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
  let driver;
  try {
    driver = await login();
    const waitForElement = useWaitForElement(driver);
    await driver.sleep(500);
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
  } finally {
    if (driver) {
      await driver.quit();
    }
  }

  console.log(chalk.magenta('Found'), chalk.green(cards.length), chalk.magenta('cards sold on SportLots'));
  return cards;
}

export async function removeFromSportLots(cardsToRemove) {
  return open('https://sportlots.com/inven/dealbin/invenrpt.tpl');
}

export default enterIntoSportLotsWebsite;
