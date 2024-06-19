import { By, Locator, until, WebDriver, WebElement } from 'selenium-webdriver';
import { Select } from 'selenium-webdriver/lib/select';

export const useHighlightElement =
  (driver: WebDriver, color: string = 'green') =>
    async (element: WebElement) =>
      driver.executeScript(`arguments[0].setAttribute('style', 'background: ${color}');`, element);

type WaitFunction = (locator: Locator | Locator[] | string, hidden?: boolean) => Promise<WebElement>;
export const useWaitForElement = (driver: WebDriver): WaitFunction => (locator: Locator | Locator[], hidden = false) => waitForElement(driver, locator, hidden);

const waitForElementToBeReady = async (driver: WebDriver, element: WebElement, hidden: boolean) => {
  if (!hidden) {
    await driver.wait(until.elementIsVisible(element));
  }
  await driver.wait(until.elementIsEnabled(element));
};

export const waitForElement = async (driver: WebDriver, locator: Locator | Locator[] | string, hidden = false): Promise<WebElement> => {
  let foundLocator: Locator;
  if (Array.isArray(locator)) {
    // @ts-ignore
    foundLocator = await Promise.any(
      locator.map(async (l) => {
        await driver.wait(until.elementLocated(l));
        return l;
      }),
    );
  } else if (typeof locator === 'string') {
    if (locator.startsWith('//') || locator.startsWith('(//')) {
      foundLocator = By.xpath(locator);
    } else {
      foundLocator = By.name(locator);
    }
  } else {
    await driver.wait(until.elementLocated(locator));
    foundLocator = locator;
  }
  const element = await driver.findElement(foundLocator);
  await useHighlightElement(driver, 'yellow')(element);

  await waitForElementToBeReady(driver, element, hidden);
  await useHighlightElement(driver)(element);
  return element;
};

export const useClickSubmit = (waitFunction: WaitFunction) => async (text?: string): Promise<void> => {
  const submitButton = text
    ? await waitFunction(By.xpath(`//input[(@type = 'submit' or @type = 'Submit' or @type = 'button' or @type = 'Button') and @value='${text}']`))
    : await waitFunction(By.xpath('//input[@type = \'submit\' or @type = \'Submit\']'));
  await submitButton.click();
};

export const useSetSelectValue = (waitFunction: WaitFunction) => async (name: string | WebElement, value: string): Promise<void> => {
  let element: WebElement;
  if (typeof name === 'string') {
    element = await waitFunction(By.name(name));
  } else {
    element = name;
  }
  let elementSelect: Select = new Select(element);
  await elementSelect.selectByValue('' + value);
};

export const useSetTextInput = (waitFunction: WaitFunction) => async (name: string | Locator, value: string): Promise<void> => {
  let element: WebElement = await waitFunction(name);
  await element.sendKeys(value);
};

export const useClickElement = (waitFunction: WaitFunction) => async (locator: Locator | Locator[] | string): Promise<void> => {
  let element: WebElement = await waitFunction(locator);
  await element.click();
};