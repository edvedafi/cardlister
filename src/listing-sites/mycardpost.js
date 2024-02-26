import { ask } from '../utils/ask.js';
import dotenv from 'dotenv';
import { Browser, Builder, By } from 'selenium-webdriver';
import { backImage, buttonByText, frontImage, inputByPlaceholder, reverseTitle, useWaitForElement } from './uploads.js';
import chalk from 'chalk';
import { useSpinners } from '../utils/spinners.js';

dotenv.config();

const color = chalk.hex('#ffc107');
const { showSpinner, log } = useSpinners('mcp', color);

let _driver;
export const login = async () => {
  if (!_driver) {
    const { finish, update } = showSpinner('login', 'Login');
    update('Loading');
    _driver = await new Builder().forBrowser(Browser.CHROME).build();
    await _driver.get('https://mycardpost.com/login');

    const waitForElement = useWaitForElement(_driver);

    update('Email');
    const emailInput = await waitForElement(inputByPlaceholder('Email *'));
    await emailInput.sendKeys(process.env.MCP_EMAIL);
    update('Password');
    const passwordInput = await waitForElement(inputByPlaceholder('Password *'));
    await passwordInput.sendKeys(process.env.MCP_PASSWORD);

    update('Submit');
    const nextButton = await waitForElement(buttonByText('Login'));
    await nextButton.click();
    await waitForElement(By.xpath(`//h2[text()='edvedafi']`));
    finish('MCP Logged In');
  }
  return _driver;
};

export async function shutdownMyCardPost() {
  const { finish } = showSpinner('shutdown', 'Shutting down My Card Post');
  if (_driver) {
    const d = _driver;
    _driver = undefined;
    await d.quit();
  }
  finish('My Card Post shutdown complete');
}

export const uploadToMyCardPost = async (cardsToUpload) => {
  const { update: updateTop, error: errorTop, finish: finishTop } = showSpinner('upload', 'Uploading to My Card Post');
  let driver;
  let totalCardsAdded = 0;

  try {
    driver = await login();

    const waitForElement = useWaitForElement(driver);

    //iterate over cardsToUpload values
    updateTop(Object.values(cardsToUpload).length);
    await driver.get('https://mycardpost.com/add-card');
    for (let card of Object.values(cardsToUpload)) {
      const { update, finish, error } = showSpinner(`upload-${card.sku}`, `Uploading ${card.title}`);

      update('Finding Form');
      const form = await waitForElement(By.xpath('//form[@action="https://mycardpost.com/add-card"]')); // Replace with the actual form identifier
      const formElement = (locator) => form.findElement(locator);

      update('Looking for Front Image button');
      const frontImageUploadButton = await formElement(By.id('front_image'));
      update('Uploading Front Image');
      await frontImageUploadButton.sendKeys(frontImage(card));
      update('Looking for Back Image button');
      const backImageUploadButton = await formElement(By.id('back_image'));
      update('Uploading Back Image');
      await backImageUploadButton.sendKeys(backImage(card));

      update('Title');
      const titleInput = await formElement(By.xpath(`//textarea[@name='name']`));
      await titleInput.sendKeys(`${card.title} [${card.sku}]`);

      update(`Price`);
      const priceInput = await formElement(By.xpath(`//input[@name='price']`));
      await priceInput.sendKeys(card.price < 1 ? 1 : card.price);

      update(`Sport`);
      const categorySelect = await formElement(By.xpath(`//select[@name='sport']`));
      await categorySelect.sendKeys(card.sport);

      update(`Team`);
      const teamInput = await formElement(By.xpath(`//span[@role='textbox' and @data-placeholder='Type something']`));
      if (card.team && card.team.length > 0) {
        for (let team of card.team) {
          await teamInput.sendKeys(team.display);
          await teamInput.sendKeys('\n');
        }
      } else {
        await teamInput.sendKeys('Green Bay Packers');
      }

      update('Card Type');
      const typeSelect = await formElement(By.id('card_type'));
      if (card.graded) {
        update('Graded');
        await typeSelect.sendKeys('Graded');
        update('Grader');
        const graderSelect = await formElement(By.id('professional_grader'));
        await graderSelect.sendKeys(card.grader);
        update('Grade');
        const gradeSelect = await formElement(By.id('grade'));
        await gradeSelect.sendKeys(card.grade);
      } else {
        update('Raw');
        await typeSelect.sendKeys('Raw');
      }

      update('Attributes');
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

      update('Description');
      const descriptionInput = await formElement(By.xpath(`//textarea[@name='details']`));
      await descriptionInput.sendKeys(`${card.longTitle}\n\n[${card.sku}]`);
      // Submit the form using JavaScript

      update('Ensure previous toast is gone');
      update('Submit');
      await driver.executeScript('arguments[0].submit();', form);

      update('Waiting for toast');
      const resultToast = await waitForElement(By.css('.toast-message'));

      if (resultToast) {
        const resultText = await resultToast.getText();
        if (resultText.indexOf('Successful') > -1) {
          totalCardsAdded++;
          finish(card.title);
        } else {
          error(`${card.title} (${resultText})`);
          await ask('Please fix and press enter to continue');
        }
      }
    }
    if (totalCardsAdded === Object.values(cardsToUpload).length) {
      finishTop(`Uploaded ${totalCardsAdded} cards to My Card Post`);
    } else {
      errorTop(`Uploaded ${totalCardsAdded} of ${Object.values(cardsToUpload).length} cards to My Card Post`);
    }
  } catch (e) {
    errorTop(e);
  }
};

export async function removeFromMyCardPost(cards) {
  let toRemove = cards.filter((card) => !card.platform.startsWith('MCP:') && !!card.sku);
  const {
    update: spin,
    error: errorOuter,
    finish: finishOuter,
  } = showSpinner('remove', `Removing ${toRemove.length} from My Card Post`);
  if (toRemove.length === 0) {
    finishOuter('remove', 'No cards to remove from MyCardPost');
    return;
  }

  spin('Login');
  const driver = await login(spin);

  spin('Setup');
  const waitForElement = useWaitForElement(driver);
  const xpath = async (text) => waitForElement(By.xpath(text));
  const notRemoved = [];
  await driver.get('https://mycardpost.com/edvedafi');

  spin('Removing');
  for (const card of toRemove) {
    const { update: spinCard, error: errorCard, finish: finishCard } = showSpinner(card.sku, card.title);
    try {
      spinCard('Searching');
      const searchInput = await xpath(`//input[@placeholder='Search Cards']`);
      await searchInput.clear();
      await searchInput.sendKeys(`[${card.sku}]`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      spinCard('Waiting for just one card');
      const header = await waitForElement([
        By.xpath('//h2[text()="All Cards (1)"]'),
        By.xpath('//h2[text()="All Cards (0)"]'),
      ]);
      const headerText = await header.getText();
      log(headerText);
      if (headerText === 'All Cards (0)') {
        await searchInput.clear();
        await searchInput.sendKeys(card.title);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const secondSearchHeader = await waitForElement([
          By.xpath('//h2[text()="All Cards (1)"]'),
          By.xpath('//h2[text()="All Cards (0)"]'),
        ]);
        const secondHeaderText = await secondSearchHeader.getText();
        if (secondHeaderText === 'All Cards (0)') {
          errorCard(`${card.title} (not found)`);
          await ask('Please fix and press enter to continue');
          continue;
        }
      }
      spinCard('Clicking Delete');
      await driver.executeScript('window.scrollBy(50,50)');
      const removeButton = await xpath('//a[text()="Delete"]');
      await removeButton.click();
      spinCard('Confirming Delete');
      const yesButton = await waitForElement(By.id('delete-btn'));
      await yesButton.click();
      spinCard('Waiting for no cards');
      await xpath('//h2[text()="All Cards (0)"]');
      finishCard(card.sku, card.title);
    } catch (e) {
      if (!(await ask(`${card.title}: Did you remove manually?`, true))) {
        errorCard(e, card.title);
        notRemoved.push(card);
      } else {
        finishCard(card.sku, card.title);
      }
    }
  }

  if (notRemoved.length === 0) {
    finishOuter(`Successfully removed ${toRemove.length} cards from MyCardPost`);
  } else {
    errorOuter(`Only removed ${toRemove.length - notRemoved.length} of ${toRemove.length} cards from MyCardPost`);
  }
}

export async function getSalesFromMyCardPost() {
  const { update, finish } = showSpinner('sales', 'My Card Post sales');
  let driver;

  try {
    driver = await login();

    const waitForElement = useWaitForElement(driver);

    //iterate over cardsToUpload values
    update('Launching site');
    await driver.get('https://mycardpost.com/orders');
    const sales = [];
    update('Watching for page to load');
    const buttons = await driver.findElements(By.xpath('//input[@type="radio"]'));
    const soldButton = buttons[2];
    update('Clicking Sold');
    soldButton.click();
    update('Waiting for Sold');
    await waitForElement(By.xpath('//h2[text()="Shipping Address"]'));
    update('Looking for a sales table');
    const orders = await driver.findElements(
      By.xpath('//div[@class="orders-blk " or @class="orders-blk"][.//child::*[@class="add-t-url"]]'),
    );

    for (const order of orders) {
      update('Get Order ID');
      const orderIdDiv = await order.findElement(By.xpath('.//div[@class="order-id"]'));
      const orderIdText = await orderIdDiv.getText();
      const orderId = orderIdText.substring(orderIdText.indexOf('#') + 1);
      update(`Getting sales from order ${orderId}`);
      const rows = await order.findElements(By.xpath('.//div[@class="col-md-4 or-lft mb-4"]/p'));
      for (let row of rows) {
        const title = await row.getText();
        const { finish: finishCard } = showSpinner(title, title);
        const skuMatch = title.match(/\[(.*)\]/);
        if (skuMatch) {
          const sku = skuMatch[1];
          const card = { sku, title, quantity: 1, platform: `MCP: ${orderId}` };
          sales.push(card);
          finishCard(title);
        } else {
          sales.push({ title, platform: `MCP ${orderId}`, ...reverseTitle(title) });
          finishCard(title);
        }
      }
    }
    finish(`Got ${sales.length} sales from My Card Post`);
    return sales;
  } catch (e) {
    finish(e);
  }
}
