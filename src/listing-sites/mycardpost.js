import { ask } from '../utils/ask.js';
import dotenv from 'dotenv';
import { Browser, Builder, By, until } from 'selenium-webdriver';
import { backImage, buttonByText, frontImage, inputByPlaceholder, parseKey, useWaitForElement } from './uploads.js';
import { validateUploaded } from './validate.js';
import chalk from 'chalk';

dotenv.config();

export const uploadToMyCardPost = async (cardsToUpload) => {
  console.log(chalk.magenta('MyCardPost Starting Upload'));
  let driver;
  let totalCardsAdded = 0;

  try {
    driver = await new Builder().forBrowser(Browser.CHROME).build();
    await driver.get('https://mycardpost.com/login');

    const waitForElement = useWaitForElement(driver);

    const emailInput = await waitForElement(inputByPlaceholder('Email *'));
    await emailInput.sendKeys(process.env.MCP_EMAIL);
    const passwordInput = await waitForElement(inputByPlaceholder('Password *'));
    await passwordInput.sendKeys(process.env.MCP_PASSWORD);

    const nextButton = await waitForElement(buttonByText('Login'));
    await nextButton.click();
    await waitForElement(By.xpath(`//h2[text()='edvedafi']`));

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
      await descriptionInput.sendKeys(card.longTitle);
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
undefined;
