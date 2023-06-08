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
  return str.split(' ').map(word => word[0].toUpperCase() + word.slice(1).toLowerCase()).join(' ')
    .split('.').map(word => word[0].toUpperCase() + word.slice(1)).join('.')
    .split("'").map(word => word[0].toUpperCase() + word.slice(1)).join("'");
}

export const byCardNumber = (a, b) => {
  //extract card number from cardNumber string
  if (parseInt(a.cardNumber) && parseInt(b.cardNumber)) {
    return parseInt(a.cardNumber) - parseInt(b.cardNumber);
  }
  const aMatcher = a.cardNumber.match(/\d+/);
  const bMatcher = b.cardNumber.match(/\d+/);
  if (aMatcher && aMatcher.length > 0 && bMatcher && bMatcher.length > 0) {
    const aNumber = parseInt(aMatcher[0]);
    const bNumber = parseInt(bMatcher[0]);
    return aNumber - bNumber;
  } else {
    if (a.cardNumber < b.cardNumber) return -1;
    if (a.cardNumber > b.cardNumber) return 1;
  }
  return 0;
};
