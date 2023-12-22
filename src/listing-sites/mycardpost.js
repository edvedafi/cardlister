import { ask } from '../utils/ask.js';
import dotenv from 'dotenv';
import { Browser, Builder, By, until } from 'selenium-webdriver';
import { backImage, buttonByText, frontImage, inputByPlaceholder, useWaitForElement } from './uploads.js';
import chalk from 'chalk';
import chalkTable from 'chalk-table';

dotenv.config();

let _driver;
const login = async () => {
  if (!_driver) {
    _driver = await new Builder().forBrowser(Browser.CHROME).build();
    await _driver.get('https://mycardpost.com/login');

    const waitForElement = useWaitForElement(_driver);

    const emailInput = await waitForElement(inputByPlaceholder('Email *'));
    await emailInput.sendKeys(process.env.MCP_EMAIL);
    const passwordInput = await waitForElement(inputByPlaceholder('Password *'));
    await passwordInput.sendKeys(process.env.MCP_PASSWORD);

    const nextButton = await waitForElement(buttonByText('Login'));
    await nextButton.click();
    await waitForElement(By.xpath(`//h2[text()='edvedafi']`));
  }
  return _driver;
};

export async function shutdownMyCardPost() {
  if (_driver) {
    const d = _driver;
    _driver = undefined;
    await d.quit();
  }
}

export const uploadToMyCardPost = async (cardsToUpload) => {
  console.log(chalk.magenta('MyCardPost Starting Upload'));
  let driver;
  let totalCardsAdded = 0;

  try {
    driver = await login();

    const waitForElement = useWaitForElement(driver);

    //iterate over cardsToUpload values
    for (let card of Object.values(cardsToUpload)) {
      await driver.get('https://mycardpost.com/add-card');
      const form = await waitForElement(By.xpath('//form[@action="https://mycardpost.com/add-card"]')); // Replace with the actual form identifier
      const formElement = (locator) => form.findElement(locator);

      // console.log('card: ', card.cardNumber);
      const frontImageUploadButton = await formElement(By.id('front_image'));
      // console.log('found front button');
      await frontImageUploadButton.sendKeys(frontImage(card));
      // console.log('front image uploaded');
      const backImageUploadButton = await formElement(By.id('back_image'));
      await backImageUploadButton.sendKeys(backImage(card));

      const titleInput = await formElement(By.xpath(`//textarea[@name='name']`));
      await titleInput.sendKeys(card.title);

      const priceInput = await formElement(By.xpath(`//input[@name='price']`));
      await priceInput.sendKeys(card.price < 1 ? 1 : card.price);

      const categorySelect = await formElement(By.xpath(`//select[@name='sport']`));
      await categorySelect.sendKeys(card.sport);

      const teamInput = await formElement(By.xpath(`//span[@role='textbox' and @data-placeholder='Type something']`));
      if (card.team && card.team.length > 0) {
        for (let team of card.team) {
          await teamInput.sendKeys(team.display);
          await teamInput.sendKeys('\n');
        }
      } else {
        await teamInput.sendKeys('Green Bay Packers');
      }

      const typeSelect = await formElement(By.id('card_type'));
      if (card.graded) {
        await typeSelect.sendKeys('Graded');
        const graderSelect = await formElement(By.id('professional_grader'));
        await graderSelect.sendKeys(card.grader);
        const gradeSelect = await formElement(By.id('grade'));
        await gradeSelect.sendKeys(card.grade);
      } else {
        await typeSelect.sendKeys('Raw');
      }

      const attributesInput = await formElement(By.id('attribute_name'));
      if (card.features?.indexOf('RC') > -1) {
        await attributesInput.sendKeys('Rookie');
      }
      if (card.printRun > 0) {
        await attributesInput.sendKeys('Serial Numbered');
        if (card.printRun === 1) {
          await attributesInput.sendKeys('1/1');
        }
      }
      if (card.autographed) {
        await attributesInput.sendKeys('Autograph');
      }
      if (card.features?.toLowerCase().indexOf('jersey') > -1 || card.features?.toLowerCase().indexOf('patch') > -1) {
        await attributesInput.sendKeys('Patch');
        await attributesInput.sendKeys('Memorabilia');
      }
      if (card.features?.toLowerCase().indexOf('mem') > -1) {
        await attributesInput.sendKeys('Memorabilia');
      }
      if (
        card.features?.toLowerCase().indexOf('sp') > -1 ||
        card.features?.toLowerCase().indexOf('sport print') > -1 ||
        card.features?.toLowerCase().indexOf('variation') > -1
      ) {
        await attributesInput.sendKeys('Short Print');
      }
      if (card.insert) {
        await attributesInput.sendKeys('Insert');
      }
      if (card.parallel) {
        await attributesInput.sendKeys('Parallel');
        if (card.parallel.indexOf('refractor')) {
          await attributesInput.sendKeys('Refractor');
        }
      }
      if (card.features?.toLowerCase().indexOf('case') > -1) {
        await attributesInput.sendKeys('Case Hit');
      }
      if (card.year < 1980) {
        await attributesInput.sendKeys('Vintage');
      }
      if (card.features?.toLowerCase().indexOf('jersey number') > -1) {
        await attributesInput.sendKeys('Jersey Numbered');
      }

      const descriptionInput = await formElement(By.xpath(`//textarea[@name='details']`));
      await descriptionInput.sendKeys(`${card.longTitle}\n\nSKU: ${card.sku}`);
      //
      // const submitButton = await waitForElement(By.xpath(`//button[@type='submit']`));
      // await submitButton.click();

      // Submit the form using JavaScript
      await driver.executeScript('arguments[0].submit();', form);

      const resultToast = await waitForElement(By.css('.toast-message'));

      if (resultToast) {
        const resultText = await resultToast.getText();
        // console.log('resultText: ', resultText);
        if (resultText.indexOf('Successful') > -1) {
          totalCardsAdded++;
          console.log('Added Card:', chalk.green(card.title));
        } else {
          console.log(chalk.red('Error uploading card: ', card));
          await ask('Please fix and press enter to continue');
        }
      }
    }
  } catch (e) {
    console.log(chalk.red('Error in MyCardPost upload: '), e);
  } finally {
    console.log(chalk.magenta('MyCardPost Upload COMPLETE! Added ', chalk.green(totalCardsAdded), ' cards'));
    if (driver) {
      await driver.quit();
    }
  }
};

export async function removeFromMyCardPost(cards) {
  let toRemove = cards.filter((card) => !card.platform.startsWith('MCP: '));
  console.log(chalk.magenta('Attempting to remove'), toRemove.length, chalk.magenta('cards from MyCardPost'));
  const driver = await login();
  const waitForElement = useWaitForElement(driver);
  const xpath = async (text) => waitForElement(By.xpath(text));
  const notRemoved = [];
  await driver.get('https://mycardpost.com/edvedafi');
  const searchInput = await xpath(`//input[@placeholder='Search Cards']`);

  for (const card of toRemove) {
    try {
      if (card.sku) {
        await searchInput.clear();
        await searchInput.sendKeys(card.sku);
        await xpath('//h2[text()="All Cards (1)"]');
        const removeButton = await xpath('//a[text()="Delete"]');
        await removeButton.click();
        await ask('Please confirm deletion and press enter to continue');
        const yesButton = await waitForElement(By.id('delete-btn'));
        await yesButton.click();
        await xpath('//h2[text()="All Cards (0)"]');
      } else {
        card.error = 'No SKU';
        notRemoved.push(card);
      }
    } catch (e) {
      card.error = e.message;
      notRemoved.push(card);
    }
  }

  if (notRemoved.length === 0) {
    console.log(
      chalk.magenta('Successfully removed all'),
      chalk.green(toRemove.length),
      chalk.magenta('cards from MyCardPost'),
    );
  } else {
    console.log(
      chalk.magenta('Only removed'),
      chalk.red(toRemove.length - notRemoved.length),
      chalk.magenta('of'),
      chalk.red(toRemove.length),
      chalk.magenta('cards from MyCardPost'),
    );
    console.log(
      chalkTable(
        {
          leftPad: 2,
          columns: [
            { field: 'title', name: 'Title' },
            { field: 'quantity', name: 'Sold' },
            { field: 'updatedQuantity', name: 'Remaining' },
            { field: 'error', name: 'Error' },
          ],
        },
        notRemoved,
      ),
    );
  }
}
