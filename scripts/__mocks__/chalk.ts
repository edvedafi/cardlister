const cyan = (str: string) => `cyan:(${str})`;
const green = (str: string) => `green:(${str})`;
const red = (str: string) => `red:(${str})`;
const yellow = (str: string) => `yellow:(${str})`;
const white = (str: string) => `white:(${str})`;
const hex = (color: string) => (str: string) => `${color}:(${str})`;
// let origChalk = global.chalk;

let chalkObject = {
  cyan,
  green,
  red,
  yellow,
  white,
  hex,
};

module.exports.chalkObject = chalkObject;

// module.exports.mockChalk = () => {
//   global.chalk = chalkObject;
// };
//
// module.exports.removeChalkMock = () => {
//   global.chalk = origChalk;
// };
//
module.exports.default = chalkObject;
// global.chalk = chalkObject;
