import { By, Select, until } from 'selenium-webdriver';
import { titleCase } from '../utils/data.js';

const createKey = (card) =>
  `${titleCase(card.sport)}|${
    card.year.indexOf('-') > -1 ? card.year.substring(0, card.year.indexOf('-')) : card.year
  }|${card.manufacture}|${card.setName}|${card.insert || ''}|${card.parallel || ''}`;
export const parseKey = (key, lowercase = false) => {
  const [sport, year, manufacture, setName, insert, parallel] = key.split('|');
  return lowercase
    ? {
        sport: sport.toLowerCase(),
        year: year.toLowerCase(),
        manufacture: manufacture.toLowerCase(),
        setName: setName.toLowerCase(),
        insert: insert.toLowerCase(),
        parallel: parallel.toLowerCase(),
      }
    : {
        sport,
        year,
        manufacture,
        setName,
        insert,
        parallel,
      };
};

export const createGroups = (allCards = {}, bulk = []) => {
  const groups = {};
  const addCardsToGroup = (cards) =>
    cards.forEach((card) => {
      if (card.quantity && card.quantity > 0 && Number.parseInt(card.quantity) === Number.parseFloat(card.quantity)) {
        const key = createKey(card);
        if (!groups[key]) {
          groups[key] = {};
        }
        if (!groups[key][card.cardNumber]) {
          groups[key][card.cardNumber] = card;
        }
      }
    });
  addCardsToGroup(Object.values(allCards));
  addCardsToGroup(bulk);
  Object.keys(groups).forEach((key) => {
    groups[key] = Object.values(groups[key]);
  });
  // console.log('groups', groups);
  return groups;
};

const createSKU = (card) =>
  `${card.sport}|${card.year.indexOf('-') > -1 ? card.year.substring(0, card.year.indexOf('-')) : card.year}|${
    card.manufacture
  }|${card.setName}|${card.insert || ''}|${card.parallel || ''}|${card.cardNumber}`;
export const parseSKU = (key) => {
  const [sport, year, manufacture, setName, insert, parallel, cardNumber] = key.split('|');
  return {
    sport,
    year,
    manufacture,
    setName,
    insert,
    parallel,
    cardNumber,
  };
};

export const useHighlightElement =
  (driver, color = 'green') =>
  async (element) =>
    driver.executeScript(`arguments[0].setAttribute('style', 'background: ${color}');`, element);

export const waitForElement = async (driver, locator, hidden = false) => {
  // console.log('looking for element: ', locator);
  try {
    await driver.wait(until.elementLocated(locator), 1000, `Looking for: ${locator}`);
  } catch (e) {
    await driver.wait(until.elementLocated(locator));
  }
  // console.log('located element: ', locator);
  const element = driver.findElement(locator);
  //turn the element yellow
  await useHighlightElement(driver, 'yellow')(element);

  // console.log('found element: ', locator);
  await waitForElementToBeReady(driver, element, hidden);
  await useHighlightElement(driver)(element);
  // console.log('ready element: ', locator);
  return element;
};

export const useWaitForElement =
  (driver) =>
  (locator, hidden = false) =>
    waitForElement(driver, locator, hidden);

export const useSetSelectValue = (driver) => async (name, value) => {
  // console.log(`Looking for ${name} to set to ${value}`);
  const brandSelector = await useWaitForElement(driver)(By.name(name));
  let brandSelectorSelect = new Select(brandSelector);
  await brandSelectorSelect.selectByValue('' + value);
};

const waitForElementToBeReady = async (driver, element, hidden) => {
  if (!hidden) {
    await driver.wait(until.elementIsVisible(element));
  }
  await driver.wait(until.elementIsEnabled(element));
};

export const useWaitForElementToBeReady =
  (driver) =>
  async (element, hidden = false) =>
    waitForElementToBeReady(driver, element, hidden);

export const caseInsensitive = (text) =>
  `[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${text}')]`;

export const buttonByText = (text) => By.xpath(`//button[descendant::text()${caseInsensitive(text.toLowerCase())}]`);
export const inputByPlaceholder = (text) => By.xpath(`//input[@placeholder='${text}']`);

export const frontImage = (card) => `${process.cwd()}/output/${card.directory}${card.frontImage}`;
export const backImage = (card) => `${process.cwd()}/output/${card.directory}${card.backImage}`;
