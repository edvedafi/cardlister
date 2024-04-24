const cyan = (str) => `cyan:(${str})`;
const green = (str) => `green:(${str})`;
const red = (str) => `red:(${str})`;
const yellow = (str) => `yellow:(${str})`;
const hex = (color) => (str) => `${color}:(${str})`;
let origChalk = global.chalk;

export const chalkObject = {
  cyan,
  green,
  red,
  yellow,
  hex,
};

export const mockChalk = () => {
  global.chalk = chalkObject;
};

export const removeChalkMock = () => {
  global.chalk = origChalk;
};

export default mockChalk;
