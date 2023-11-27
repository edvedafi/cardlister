import { By, until } from 'selenium-webdriver';

const createKey = (card) =>
  `${card.sport}|${card.year.indexOf('-') > -1 ? card.year.substring(0, card.year.indexOf('-')) : card.year}|${
    card.manufacture
  }|${card.setName}|${card.insert || ''}|${card.parallel || ''}`;
export const parseKey = (key) => {
  const [sport, year, manufacture, setName, insert, parallel] = key.split('|');
  return {
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
  return groups;
};

export const waitForElement = async (driver, locator, hidden = false) => {
  console.log('looking for element: ', locator);
  await driver.wait(until.elementLocated(locator));
  console.log('located element: ', locator);
  const element = driver.findElement(locator);

  console.log('found element: ', locator);
  await waitForElementToBeReady(driver, element, hidden);
  console.log('ready element: ', locator);
  return element;
};

export const useWaitForElement =
  (driver) =>
  (locator, hidden = false) =>
    waitForElement(driver, locator, hidden);

const waitForElementToBeReady = async (driver, element, hidden) => {
  if (!hidden) {
    await driver.wait(until.elementIsVisible(element));
  }
  await driver.wait(until.elementIsEnabled(element));
};

export const useWaitForElementToBeReady = (driver) => async (element, hidden) =>
  waitForElementToBeReady(driver, element, hidden);

export const caseInsensitive = (text) =>
  `[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${text}')]`;

export const buttonByText = (text) => By.xpath(`//button[descendant::text()${caseInsensitive(text.toLowerCase())}]`);
export const inputByPlaceholder = (text) => By.xpath(`//input[@placeholder='${text}']`);

export const frontImage = (card) => `${process.cwd()}/output/${card.directory}${card.frontImage}`;
export const backImage = (card) => `${process.cwd()}/output/${card.directory}${card.backImage}`;
