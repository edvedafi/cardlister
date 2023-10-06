import { byCardNumber } from "../utils/data.js";
import { Browser, Builder, By, until, Select } from "selenium-webdriver";
import { ask, validateAllUploaded } from "../utils/ask.js";
import chalkTable from "chalk-table";

const brands = {
  bowman: "Bowman",
  donruss: "Donruss",
  fleer: "Fleer",
  itg: "ITG",
  "o-pee-chee": "O-Pee-Chee",
  pacific: "Pacific",
  panini: "Panini",
  score: "Score",
  sp: "SP",
  "stadium club": "Stadium Club",
  tops: "Topps",
  ultra: "Ultra",
  "upper deck": "Upper Deck",
  ud: "Upper Deck",
};

async function writeSportLotsOutput(allCards, bulk) {
  const sortedCards = {};

  //group cards
  Object.values(allCards).forEach((card) => {
    if (!sortedCards[card.year]) {
      sortedCards[card.year] = {};
    }
    let setName = card.setName;
    const addToSetName = (modifier) => {
      if (modifier) {
        setName = `${setName} ${modifier}`;
      }
    };
    addToSetName(card.insert);
    addToSetName(card.parallel);

    if (!sortedCards[card.year][setName]) {
      sortedCards[card.year][setName] = [];
    }
    sortedCards[card.year][setName].push(card);
  });

  //sort all cards in year by cardNumber
  Object.keys(sortedCards).forEach((year) => {
    Object.keys(sortedCards[year]).forEach((setName) => {
      sortedCards[year][setName].sort((a, b) => parseInt(a.cardNumber) - parseInt(b.cardNumber));
    });
  });

  //write output sorted by year and then setName
  const output = [];
  Object.keys(sortedCards)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .forEach((year) => {
      output.push(""); //add blank line between years
      output.push(year);
      Object.keys(sortedCards[year])
        .sort()
        .forEach((setName) => {
          output.push(`  ${setName}`);
          sortedCards[year][setName].sort(byCardNumber).forEach((card) => {
            output.push(`    ${card.cardNumber} ${card.player} ${card.slPrice} (${card.quantity})`);
          });
        });
    });
  output.push("");
  try {
    await fs.outputFile("output/sportlots.txt", output.join("\n"));
  } catch (err) {
    console.error("Failed to write sportlots.txt");
    console.error(err);
    throw err;
  }

  const cardsToUpload = {};
  const addCardsToUpload = (card) => {
    let setName = card.setName;
    const addToSetName = (modifier) => {
      if (modifier) {
        setName = `${setName} ${modifier}`;
      }
    };
    addToSetName(card.insert);
    addToSetName(card.parallel);
    const key = JSON.stringify({
      year: card.year,
      sport: card.sport,
      brand: brands[card.setName.toLowerCase()] || brands[card.manufacture.toLowerCase()] || "All Brands",
      setName,
    });
    if (!cardsToUpload[key]) {
      cardsToUpload[key] = {};
    }
    cardsToUpload[key][card.cardNumber] = card;
    //also add to cardsToUpLoad removing all non-numeric characters from cardNumber
    const cardNumber = card.cardNumber.toString().replace(/\D/g, "");
    if (cardNumber) {
      cardsToUpload[key][cardNumber] = { ...card, noNumberDuplicate: true };
    }
  };
  Object.values(allCards).forEach(addCardsToUpload);
  bulk?.forEach(addCardsToUpload);

  await enterIntoSportLotsWebsite(cardsToUpload);
}

async function enterIntoSportLotsWebsite(cardsToUpload) {
  let driver;

  try {
    driver = await new Builder().forBrowser(Browser.CHROME).build();
    await driver.get("https://sportlots.com/cust/custbin/login.tpl?urlval=/index.tpl&qs=");

    // console.log("writing: ", cardsToUpload);
    const setSelectValue = async (name, value) => {
      const brandSelector = await waitForElement(By.name(name));
      let brandSelectorSelect = new Select(brandSelector);
      await brandSelectorSelect.selectByValue("" + value);
    };

    // await setTimeout(10000);

    const waitForElement = async (locator) => {
      await driver.wait(until.elementLocated(locator));
      const element = driver.findElement(locator);
      await driver.wait(until.elementIsVisible(element));
      await driver.wait(until.elementIsEnabled(element));
      return element;
    };

    const clickSubmit = async () => {
      const submitButton = await waitForElement(By.xpath("//input[@type = 'submit']"));
      await submitButton.click();
    };

    const signInButton = await waitForElement(By.xpath("//input[@name = 'email_val']"));
    await signInButton.sendKeys(process.env.SPORTLOTS_ID);

    const passwordField = await waitForElement(By.xpath("//input[@name = 'psswd']"));
    await passwordField.sendKeys(process.env.SPORTLOTS_PASS);

    await clickSubmit();

    for (const key in cardsToUpload) {
      const setInfo = JSON.parse(key);
      let cardsAdded = 0;

      const selectBrand = async (year, sport, brand) => {
        await driver.get("https://sportlots.com/inven/dealbin/newinven.tpl");
        try {
          await setSelectValue("yr", year);
          await setSelectValue("sprt", { baseball: "BB", football: "FB", basketball: "BK" }[sport.toLowerCase()]);
          await setSelectValue("brd", brand);
        } catch (e) {
          await ask(`Please select the proper filters and then Press any key to continue...`);
        }
        await clickSubmit();
      };

      const selectSet = async (setName) => {
        try {
          let found = false;
          const rows = await driver.findElements(By.xpath(`//*[contains(text(), '${setName}')]`));
          for (let row of rows) {
            const fullSetText = await row.getText();
            // if the fullSetText is numbers followed by a space followed by the value in the  setName variable
            // or if the fullSetText is numbers followed by a space followed by the setName followed by "Base Set"
            const regex = new RegExp(`^\\d+( ${setInfo.brand})? ${setName}( Base Set)?$`);
            if (regex.test(fullSetText)) {
              const fullSetNumbers = fullSetText.split(" ")[0];
              //find the radio button where the value is fullSetNumbers
              const radioButton = await driver.findElement(By.xpath(`//input[@value = '${fullSetNumbers}']`));
              await radioButton.click();
              found = true;
            }
          }

          if (!found) {
            if (setName.startsWith("Donruss")) {
              await selectBrand(setInfo.year, setInfo.sport, "Donruss");
              await selectSet(setName.replace("Donruss", "").trim());
            } else {
              await ask(`Please select [${setName}] and then Press any key to continue...`);
            }
          }

          await clickSubmit();
        } catch (e) {
          if (setName.startsWith("Donruss")) {
            await selectBrand(setInfo.year, setInfo.sport, "Donruss");
            await selectSet(setName.replace("Donruss", "").trim());
          } else {
            await ask(`Please select [${setName}] and then Press any key to continue...`);
            await clickSubmit();
          }
        }
      };

      await selectBrand(setInfo.year, setInfo.sport, setInfo.brand);
      await selectSet(setInfo.setName);

      while ((await driver.getCurrentUrl()).includes("listcards.tpl")) {
        let pageAdds = 0;
        let rows = await driver.findElements({
          css: "table > tbody > tr:first-child > td:first-child > form > table > tbody > tr",
        });

        // console.log("cardsToUpload[key]", Object.keys(cardsToUpload[key]));

        let firstCardNumber, lastCardNumber;
        for (let row of rows) {
          // Find the columns of the current row.
          let columns = await row.findElements({ css: "td" });

          if (columns && columns.length > 1) {
            // Extract the text from the second column.
            let tableCardNumber = await columns[1].getText();
            if (!firstCardNumber) {
              firstCardNumber = Number.parseInt(tableCardNumber);
            }
            lastCardNumber = Number.parseInt(tableCardNumber);

            const card = cardsToUpload[key][tableCardNumber];

            if (card) {
              // console.log("uploading: ", card);
              let cardNumberTextBox = await columns[0].findElement({ css: "input" });
              await cardNumberTextBox.sendKeys(card.quantity);

              const priceTextBox = await columns[3].findElement({ css: "input" });
              priceTextBox.clear();
              await priceTextBox.sendKeys(card.slPrice);
              pageAdds++;
            }
          }
        }

        //in the case where 'Skip to Page' exists we know that there are multiple pages so we should only be counting
        //the cards that fit within the current range. Otherwise we should be counting all cards.
        const skipToPage = await driver.findElements(By.xpath(`//*[contains(text(), 'Skip to Page')]`));
        let expectedCards;
        if (skipToPage.length > 0) {
          expectedCards = Object.keys(cardsToUpload[key]).filter((cardNumber) => {
            return cardNumber >= firstCardNumber && cardNumber <= lastCardNumber;
          });
        } else {
          expectedCards = Object.keys(cardsToUpload[key]).filter(
            (cardNumber) => !cardsToUpload[key][cardNumber]?.noNumberDuplicate,
          );
        }

        await validateAllUploaded(expectedCards, pageAdds, cardsToUpload[key], "slPrice");

        await clickSubmit();
        const resultHeader = await driver.wait(until.elementLocated(By.xpath(`//h2[contains(text(), 'cards added')]`)));
        const resultText = await resultHeader.getText();
        const cardsAddedText = resultText.match(/(\d+) cards added/);
        if (cardsAddedText) {
          cardsAdded += parseInt(cardsAddedText[0]);
        }
      }

      console.log(`${cardsAdded} cards added to Sportlots at ${key}`);
    }
  } catch (e) {
    console.log("Failed to upload to SportLots");
    console.log(e);
    await ask("Press any key to continue...");
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
}

export default writeSportLotsOutput;
