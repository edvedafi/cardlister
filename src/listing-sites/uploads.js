import { By, Select, until } from 'selenium-webdriver';
import { manufactures, sets, titleCase } from '../utils/data.js';
import { getGroup, getGroupByBin } from './firebase.js';
import chalk from 'chalk';
import { useSpinners } from '../utils/spinners.js';

const color = chalk.greenBright;
const { showSpinner, log } = useSpinners('uploads', color);

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
  const { finish } = showSpinner('createGroups', 'Creating Groups');
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
  finish(`Created Groups: [${Object.keys(groups)}]`);
  return groups;
};

export const useHighlightElement =
  (driver, color = 'green') =>
  async (element) =>
    driver.executeScript(`arguments[0].setAttribute('style', 'background: ${color}');`, element);

export const waitForElement = async (driver, locator, hidden = false) => {
  const { update, finish } = showSpinner(
    `waitForElement-${locator}`,
    `Waiting for element: ${Array.isArray(locator) ? locator.join(' or ') : locator}`,
  );

  let foundLocator = locator;
  if (Array.isArray(locator)) {
    foundLocator = await Promise.any(
      locator.map(async (l) => {
        await driver.wait(until.elementLocated(l));
        return l;
      }),
    );
  } else {
    await driver.wait(until.elementLocated(locator));
  }
  update('located');
  const element = driver.findElement(foundLocator);
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
    cardNumber: title.match(/#(\S+(?:\s*-\s*\S+)*)/)?.[1].replaceAll(' ', ''),
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

export async function buildTableData(groupedCards) {
  const { finish } = showSpinner('buildTableData', 'Building table data');
  const divider = {
    sport: '--------',
    year: '----',
    setName: '---',
    parallel: '--------',
    insert: '------',
    cardNumber: '-----',
    quantity: '-----',
    title: '-----',
    platform: '--------',
  };
  Object.values(groupedCards).forEach((cards) =>
    cards.forEach((card) =>
      Object.keys(divider).forEach((key) => {
        divider[key] = '-'.repeat(Math.max(parseInt(card[key]?.length || 0), parseInt(divider[key]?.length || 0)));
      }),
    ),
  );

  const displayCards = [];
  let color = chalk.magenta;
  const orderColors = {};
  const orderColor = (orderId) => {
    if (!orderColors[orderId]) {
      orderColors[orderId] = [
        chalk.red,
        // chalk.green,
        chalk.yellow,
        chalk.blue,
        // chalk.magenta,
        chalk.cyan,
        chalk.white,
        chalk.redBright,
        // chalk.greenBright,
        chalk.yellowBright,
        chalk.blueBright,
        // chalk.magentaBright,
        chalk.cyanBright,
        chalk.whiteBright,
        chalk.bgRed,
        chalk.bgGreen,
        chalk.bgYellow,
        chalk.bgBlue,
        chalk.bgMagenta,
        chalk.bgCyan,
        chalk.bgWhite,
        chalk.bgBlackBright,
        chalk.bgRedBright,
        chalk.bgGreenBright,
        chalk.bgYellowBright,
        chalk.bgBlueBright,
        chalk.bgMagentaBright,
        chalk.bgCyanBright,
        chalk.bgWhiteBright,
      ][Object.keys(orderColors).length];
    }
    return orderColors[orderId];
  };

  (await Promise.all(Object.keys(groupedCards).map((bin) => getGroupByBin(bin))))
    .sort((group1, group2) => {
      if (group2.sport.toLowerCase() !== group1.sport.toLowerCase()) {
        return group2.sport.toLowerCase() < group1.sport.toLowerCase() ? -1 : 1;
      } else if (group2.year !== group1.year) {
        return group2.year < group1.year ? -1 : 1;
      } else if (group2.manufacture !== group1.manufacture) {
        return group2.manufacture < group1.manufacture ? -1 : 1;
      } else if (group2.setName !== group1.setName) {
        return group2.setName < group1.setName ? -1 : 1;
      } else if (group2.insert !== group1.insert) {
        return group2.insert < group1.insert ? -1 : 1;
      } else if (group2.parallel !== group1.parallel) {
        return group2.parallel < group1.parallel ? -1 : 1;
      } else {
        return 0;
      }
    })
    .forEach(({ bin }, i) => {
      if (i > 0) displayCards.push(divider);
      displayCards.push(
        ...groupedCards[bin]
          .sort((c1, c2) => {
            try {
              const cardNumber1 = parseInt(c1.cardNumber);
              const cardNumber2 = parseInt(c2.cardNumber);
              if (cardNumber1 && cardNumber2) {
                return cardNumber1 - cardNumber2;
              } else if (cardNumber1) {
                return -1;
              } else if (cardNumber2) {
                return 1;
              } else {
                return 0;
              }
            } catch (e) {
              if (c1.cardNumber && c2.cardNumber) {
                return c1.cardNumber.localeCompare(c2.cardNumber);
              } else if (c1.cardNumber) {
                return -1;
              } else if (c2.cardNumber) {
                return 1;
              } else {
                return 0;
              }
            }
          })
          .map((card) => {
            Object.keys(card).forEach(
              (key) => (card[key] = key === 'platform' ? orderColor(card.platform)(card.platform) : color(card[key])),
            );
            return card;
          }),
      );
      color = color === chalk.magentaBright ? chalk.greenBright : chalk.magentaBright;
    });
  finish();
  return displayCards;
}

export const convertTitleToCard = (title) => {
  const cardNumberIndex = title.indexOf('#');
  const yearIdx = title.match(/\D*-?\D+/)?.index;
  let setInfo = title.slice(yearIdx, cardNumberIndex).trim();
  let setInfoLower = setInfo.toLowerCase();
  const card = {
    cardNumber: title.match(/#(\S+(?:\s*-\s*\S+)*)/)?.[1].replaceAll(' ', ''),
    year: title.split(' ')[0],
    parallel: '',
    insert: '',
    title,
  };

  const sport = { BB: 'Baseball', FB: 'Football', BK: 'Basketball' }[title.slice(-2)];
  if (sport) {
    card.sport = sport;
  }

  const manufacture = manufactures.find((m) => setInfoLower.indexOf(m) > -1);
  if (manufacture) {
    card.manufacture = setInfo.slice(setInfoLower.indexOf(manufacture), manufacture.length);
    setInfo = setInfo.replace(card.manufacture, '').trim();
    setInfoLower = setInfo.toLowerCase();
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
      setInfoLower = setInfo.toLowerCase();
    }

    if (
      setInfoLower.length > 0 &&
      setInfoLower !== 'base' &&
      setInfoLower !== 'base set' &&
      setInfoLower !== 'insert' &&
      setInfoLower !== 'parallel'
    ) {
      if (!card.setName) {
        card.setName = setInfo;
      } else if (!card.insert) {
        card.insert = setInfo;
      } else {
        card.extraSetInfo = setInfo;
      }
    }
  } else if (!card.setName) {
    card.setName = card.manufacture;
  }

  return card;
};
