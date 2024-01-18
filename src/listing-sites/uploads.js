import { By, Select, until } from 'selenium-webdriver';
import { manufactures, sets, titleCase } from '../utils/data.js';
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
  const { update, finish } = showSpinner(`waitForElement-${locator}`, `Waiting for element: ${locator}`);

  try {
    await driver.wait(until.elementLocated(locator), 1000, `Looking for: ${locator}`);
  } catch (e) {
    await driver.wait(until.elementLocated(locator));
  }
  update('located');
  const element = driver.findElement(locator);
  update('yellowing');
  await useHighlightElement(driver, 'yellow')(element);

  update('waiting for ready');
  await waitForElementToBeReady(driver, element, hidden);
  update('highlighting');
  await useHighlightElement(driver)(element);
  finish();
  return element;
};

export const useWaitForElement =
  (driver) =>
  (locator, hidden = false) =>
    waitForElement(driver, locator, hidden);

export const useSetSelectValue = (driver) => async (name, value) => {
  let brandSelector = name;
  if (typeof name === 'string') {
    brandSelector = await useWaitForElement(driver)(By.name(name));
  }
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

export const reverseTitle = (title) => {
  const cardNumberIndex = title.indexOf('#');
  const yearIdx = title.match(/\D*-?\D+/)?.index;
  let setInfo = title.slice(yearIdx, cardNumberIndex).trim();
  const card = {
    cardNumber: title.match(/#(.*\w+)/)?.[1].replaceAll(' ', ''),
    year: title.split(' ')[0],
    parallel: '',
    insert: '',
    // setName: setName.join('|'),
    // manufacture: 'Panini',
    setName: setInfo,
    // sport: 'Football',
  };

  const manufacture = manufactures.find((m) => setInfo.toLowerCase().indexOf(m) > -1);
  if (manufacture) {
    if (manufacture === 'score') {
      card.manufacture = 'Panini';
    } else {
      card.manufacture = setInfo.slice(setInfo.toLowerCase().indexOf(manufacture), manufacture.length);
      setInfo = setInfo.replace(card.manufacture, '').trim();
      card.setName = setInfo;
    }
  }

  const set = sets.find((s) => setInfo.toLowerCase().indexOf(s) > -1);
  if (set) {
    card.setName = setInfo.slice(setInfo.toLowerCase().indexOf(set), set.length);
    setInfo = setInfo.replace(card.setName, '').trim();
    if (!card.manufacture) {
      const paniniSearch = `panini ${card.setName.toLowerCase()}`;
      if (sets.find((s) => s === paniniSearch)) {
        card.manufacture = 'Panini';
      } else {
        const toppsSearch = `topps ${card.setName.toLowerCase()}`;
        if (sets.find((s) => s === toppsSearch)) {
          card.manufacture = 'Topps';
        }
      }
    }
  }

  const insertIndex = setInfo.toLowerCase().indexOf('insert');
  if (insertIndex > -1) {
    card.insert = setInfo.slice(0, insertIndex).trim();
    setInfo = setInfo.replace(card.insert, '').trim();
    setInfo = setInfo.replace('Insert', '').trim();
  }

  const parallelIndex = setInfo.toLowerCase().indexOf('parallel');
  if (parallelIndex > -1) {
    card.parallel = setInfo.slice(0, parallelIndex).trim();
    setInfo = setInfo.replace(card.parallel, '').trim();
    setInfo = setInfo.replace('Parallel', '').trim();
  }

  if (setInfo.length > 0) {
    if (!card.insert) {
      card.insert = setInfo;
    } else if (!card.parallel) {
      card.parallel = setInfo;
    } else {
      console.log('No Field left to put the remaining SetInfo', setInfo, 'for', card);
    }
  }

  // console.log('card', card);

  return card;
};

export async function getSelectOptions(selectBox) {
  // Get all the option elements within the select box
  const options = await selectBox.findElements(By.tagName('option'));

  // Create an array to store the option values and text
  const selectOptions = [];

  // Iterate through each option and extract the value and text
  for (const option of options) {
    const value = await option.getAttribute('value');
    const name = await option.getText();

    // Add the value and text to the selectOptions array
    selectOptions.push({ value, name });
  }
  return selectOptions;
}
