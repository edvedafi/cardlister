export const isYes = (str: string | boolean | unknown): boolean =>
  (typeof str === 'boolean' && str) ||
  (typeof str === 'string' && ['yes', 'YES', 'y', 'Y', 'Yes', 'YEs', 'YeS', 'yES'].includes(str));

export const isNo = (str: string | boolean | unknown): boolean =>
  (typeof str === 'boolean' && !str) || (typeof str === 'string' && ['no', 'NO', 'n', 'N', 'No'].includes(str));

export const titleCase = (str: string): string => str ? str
  .trim()
  .split(' ')
  .map((word) => {
    if (word.length > 3 && word.toLowerCase().startsWith('mc')) {
      return 'Mc' + word[2].toUpperCase() + word.slice(3).toLowerCase();
    } else {
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    }
  })
  .join(' ')
  .split('.')
  .map((word) => word[0]?.toUpperCase() + word.slice(1))
  .join('.')
  .split('\'')
  .map((word) => word[0]?.toUpperCase() + word.slice(1))
  .join('\'') : '';