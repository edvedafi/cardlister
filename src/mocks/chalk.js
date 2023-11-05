const cyan = (str) => `cyan:(${str})`;
const green = (str) => `green:(${str})`;
const red = (str) => `red:(${str})`;
const yellow = (str) => `yellow:(${str})`;
let origChalk = global.chalk;

export const mockChalk = () => {
  global.chalk = {
    cyan,
    green,
    red,
    yellow,
  };
};

export const removeChalkMock = () => {
  global.chalk = origChalk;
};
