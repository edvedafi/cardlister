const cyan = (str) => `cyan:(${str})`;
const green = (str) => `green:(${str})`;
const red = (str) => `red:(${str})`;
const yellow = (str) => `yellow:(${str})`;
const white = (str) => `white:(${str})`;
const hex = (color) => (str) => `${color}:(${str})`;
let origChalk = global.chalk;

let chalkObject = {
  cyan,
  green,
  red,
  yellow,
  white,
  hex,
};

module.exports.chalkObject = chalkObject;

module.exports.mockChalk = () => {
  global.chalk = chalkObject;
};

module.exports.removeChalkMock = () => {
  global.chalk = origChalk;
};

module.exports.default = chalkObject;
global.chalk = chalkObject;
