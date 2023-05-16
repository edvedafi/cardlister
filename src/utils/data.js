export const isYes = str =>
  typeof str === 'boolean' && str ||
  typeof str === 'string' &&
  ['yes', 'YES', 'y', 'Y', 'Yes', 'YEs', 'YeS', 'yES'].includes(str);
export const isNo = str =>
  typeof str === 'boolean' && !str ||
  typeof str === 'string' && ['no', 'NO', 'n', 'N', 'No'].includes(str);

export const titleCase = str => {
  if (!str) {
    return str;
  }
  return str.split(' ').map(word => word[0].toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}
