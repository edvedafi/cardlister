export const isYes = str =>
  typeof str === 'boolean' && str ||
  typeof str === 'string' &&
  ['yes', 'YES', 'y', 'Y', 'Yes', 'YEs', 'YeS', 'yES'].includes(str);
export const isNo = str =>
  typeof str === 'boolean' && !str ||
  typeof str === 'string' && ['no', 'NO', 'n', 'N', 'No'].includes(str);
