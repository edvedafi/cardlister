import { ask } from '../utils/ask.js';
import dotenv from 'dotenv';
import { Browser, Builder, By, until } from 'selenium-webdriver';
import { caseInsensitive, parseKey, useWaitForElement, useWaitForElementToBeReady } from './uploads.js';
import { validateUploaded } from './validate.js';

dotenv.config();

export const uploadToBuySportsCards = async (groupedCards) => {
  console.log(chalk.magenta('BSC Starting Upload'));
  let driver;
  let totalCardsAdded = 0;

  try {
    driver = await new Builder().forBrowser(Browser.CHROME).build();
    await driver.get('https://www.buysportscards.com');

    const waitForElement = useWaitForElement(driver);

    const waitForElementToBeReady = useWaitForElementToBeReady(driver);

    const waitForButton = (text) =>
      waitForElement(By.xpath(`//button[descendant::text()${caseInsensitive(text.toLowerCase())}]`));

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

    await driver.get('https://www.buysportscards.com/sellers/bulk-upload');

    // groupedCards = {
    //   'football|2020|Panini|Chronicles|Panini|': groupedCards['football|2020|Panini|Chronicles|Panini|'],
    // };
    //for loop over entries in groupedCards
    console.log('Uploading:', Object.keys(groupedCards));

    for (const key in groupedCards) {
      const setData = parseKey(key);
      const setFilter = async (placeHolderField, checkboxValue) => {
        const sportSearchField = await waitForElement(By.xpath(`//input[@placeholder='${placeHolderField}']`));
        await sportSearchField.clear();
        await sportSearchField.sendKeys(checkboxValue?.trim());
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

      await setFilter('Search Sport', setData.sport);
      await setFilter('Search Year', setData.year);
      let foundSet = await setFilter('Search Set', `${setData.manufacture} ${setData.setName}`);
      if (!foundSet) {
        foundSet = await setFilter('Search Set', `${setData.setName}`);
      }
      if (!foundSet) {
        console.log(`Please select ${chalk.red(setData.manufacture)} ${chalk.red(setData.setName)} to continue.`);
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
        // await setFilter('Search Variant', 'Base');

        const checkbox = await waitForElement(By.xpath(`//input[@type='checkbox' and @value='base']`), true);
        console.log('checkbox', checkbox);
        await checkbox.click();
      }

      const conditionSelect = await waitForElement(By.css('.MuiSelect-select'));
      await conditionSelect.click();
      const conditionList = await waitForElement(By.xpath(`//*[@data-value='near_mint']`));
      await conditionList.click();
      const nextButton = await waitForButton('Generate');
      await nextButton.click();

      let pageAdds = 0;
      let added = [];
      await waitForElement(By.id('frontImageInput0'), true);
      let tables = await driver.findElements(By.css(`.MuiTable-root`));
      await waitForElementToBeReady(tables[0]);
      const table = tables[0];
      const body = await table.findElement(By.xpath(`./tbody`));
      await waitForElementToBeReady(body);

      const rows = await body.findElements(By.xpath(`./tr`));

      const cardsToUpload = groupedCards[key];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const columns = await row.findElements(By.xpath(`./td`));

        const cardNumberElement = await columns[1].findElement(By.xpath('./*'));
        const tableCardNumber = await cardNumberElement.getText();

        const card = cardsToUpload.find((card) => card.cardNumber.toString() === tableCardNumber);
        if (card) {
          // console.log('uploading: ', card);
          let cardNumberTextBox = await columns[6].findElement({ css: 'input' });
          const currentValue = await cardNumberTextBox.getAttribute('value');
          let newQuantity = card.quantity;
          if (currentValue) {
            await cardNumberTextBox.sendKeys('\u0008\u0008');
            newQuantity += Number.parseInt(currentValue);
          }

          const priceTextBox = await columns[5].findElement({ css: 'input' });
          await priceTextBox.clear();
          await driver.wait(until.elementTextIs(priceTextBox, ''), 5000);
          await priceTextBox.sendKeys(card.bscPrice);

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
            console.log(`Added Card ${chalk.green(tableCardNumber)}${card.frontImage ? ' with images' : ''}`);
          } catch (e) {
            console.log(`Failed to add Image to card ${chalk.red(tableCardNumber)}`);
          }

          pageAdds++;
          added.push(card);
        } else {
          // console.log(`Did not find card ${tableCardNumber}`);
        }
      }

      await validateUploaded(cardsToUpload, added, 'bscPrice');

      await driver.executeScript('window.scrollTo(0, 0);');
      const saveButton = await waitForButton('Save');
      await saveButton.click();

      await waitForElement(By.className('MuiAlert-filledSuccess'));

      console.log(`Added ${chalk.green(pageAdds)} cards for ${chalk.cyan(key)}`);

      const reset = await waitForButton('Reset');
      await reset.click();
    }
  } catch (e) {
    console.log('Error in BSC upload: ', e);
  } finally {
    console.log(chalk.magenta('BSC Upload COMPLETE!'));
    if (driver) {
      await driver.quit();
    }
  }
};
