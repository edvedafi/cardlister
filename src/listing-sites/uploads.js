import { By, Select, until } from 'selenium-webdriver';
import { titleCase } from '../utils/data.js';
import { getGroup, getGroupByBin } from './firebase.js';
import chalk from 'chalk';
import { useSpinners } from '../utils/spinners.js';

const color = chalk.yellow;
const log = (...params) => console.log(color(...params));
const { showSpinner, finishSpinner, updateSpinner, errorSpinner } = useSpinners('uploads', color);

const createKey = (card) =>
  `${titleCase(card.sport)}|${
    card.year.indexOf('-') > -1 ? card.year.substring(0, card.year.indexOf('-')) : card.year
  }|${card.manufacture}|${card.setName}|${card.insert || ''}|${card.parallel || ''}`;
export const parseKey = async (key, lowercase = false) => {
  const splitKey = key.split('|');
  if (splitKey.length > 2) {
    const [sport, year, manufacture, setName, insert, parallel] = splitKey;
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
  } else {
    return getGroupByBin(splitKey[0]);
  }
};

export const createGroups = async (allCards = {}, bulk = []) => {
  showSpinner('createGroups', 'Creating Groups');
  const groups = {};
  const addCardsToGroup = async (cards = []) => {
    for (const card of cards) {
      if (card.quantity && card.quantity > 0 && Number.parseInt(card.quantity) === Number.parseFloat(card.quantity)) {
        const key = card.bin || (await getGroup(card, createKey(card))).bin;
        if (!groups[key]) {
          groups[key] = {};
        }
        if (!groups[key][card.cardNumber]) {
          groups[key][card.cardNumber] = card;
        }
      }
    }
  };
  await addCardsToGroup(Object.values(allCards));
  await addCardsToGroup(bulk);

  Object.keys(groups).forEach((key) => {
    groups[key] = Object.values(groups[key]);
  });
  finishSpinner('createGroups', `Created Groups: [${Object.keys(groups)}]`);
  return groups;
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
  `[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${text?.toLowerCase()}')]`;

export const buttonByText = (text) => By.xpath(`//button[descendant::text()${caseInsensitive(text.toLowerCase())}]`);
export const inputByPlaceholder = (text) => By.xpath(`//input[@placeholder='${text}']`);

export const frontImage = (card) => `${process.cwd()}/output/${card.directory}${card.frontImage}`;
export const backImage = (card) => `${process.cwd()}/output/${card.directory}${card.backImage}`;
