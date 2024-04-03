export const isYes = (str) =>
  (typeof str === 'boolean' && str) ||
  (typeof str === 'string' && ['yes', 'YES', 'y', 'Y', 'Yes', 'YEs', 'YeS', 'yES'].includes(str));
export const isNo = (str) =>
  (typeof str === 'boolean' && !str) || (typeof str === 'string' && ['no', 'NO', 'n', 'N', 'No'].includes(str));

export const titleCase = (str) => {
  if (!str) {
    return str;
  }
  try {
    return str
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
      .split("'")
      .map((word) => word[0]?.toUpperCase() + word.slice(1))
      .join("'");
  } catch (e) {
    console.log('error title casing', str);
    throw e;
  }
};

export const byCardNumber = (a, b) => {
  //extract card number from cardNumber string
  if (a.cardNumber && parseInt(a.cardNumber) && b.cardNumber && parseInt(b.cardNumber)) {
    return parseInt(a.cardNumber) - parseInt(b.cardNumber);
  }
  const aMatcher = a.cardNumber?.match(/\d+/) || [];
  const bMatcher = b.cardNumber?.match(/\d+/) || [];
  if (aMatcher && aMatcher.length > 0 && bMatcher && bMatcher.length > 0) {
    const aNumber = parseInt(aMatcher[0]);
    const bNumber = parseInt(bMatcher[0]);
    return aNumber - bNumber;
  } else {
    if (a.cardNumber < b.cardNumber) return -1;
    if (a.cardNumber > b.cardNumber) return 1;
  }

  return a.player < b.player ? -1 : a.player > b.player ? 1 : 0;
};

export const firstDifference = (a, b) => {
  //find the first word that is different between a and b
  const aWords = a.split(' ');
  const bWords = b.split(' ');
  for (let i = 0; i < aWords.length; i++) {
    if (aWords[i] !== bWords[i]) {
      return aWords[i];
    }
  }
};

export const graders = [
  'PSA',
  'BCCG',
  'BVG',
  'BGS',
  'CSG',
  'CGC',
  'SGC',
  'KSA',
  'GMA',
  'HGA',
  'ISA',
  'PCA',
  'GSG',
  'PGS',
  'MNT',
  'TAG',
  'Rare',
  'RCG',
  'PCG',
  'Ace',
  'CGA',
  'TCG',
  'ARK',
];

export const manufactures = [
  'topps',
  'panini',
  'sage',
  'upper deck',
  'donruss',
  'fleer',
  'score',
  'pinnacle',
  'playoff',
];

export const sets = [
  'prizm',
  'bowman',
  'chronicles',
  'chronicles draft picks',
  'donruss',
  'donruss optic',
  'optic',
  'sage',
  'score',
  'topps',
  'fleer',
  'pinnacle',
  'playoff',
  'upper deck',
  'elite',
  'contenders',
  'select',
  'absolute',
  'gridiron kings',
  'classics',
  'prestige',
  'crown royale',
  'limited',
  'topps chrome',
  'topps finest',
  'topps stadium club',
  'topps heritage',
  'topps archives',
  'topps tribute',
  'topps inception',
  'topps allen & ginter',
  'topps gypsy queen',
  'topps tier one',
  'topps tribute',
  'topps dynasty',
  'topps museum collection',
  'topps five star',
  'topps triple threads',
  'topps archives signature series',
  'topps clearly authentic',
  'topps luminaries',
  'topps gold label',
  'topps update',
  'topps holiday',
  'topps opening day',
  'topps heritage high number',
  'topps big league',
  'big league',
  'topps heritage minors',
  'topps allen & ginter x',
  'topps heritage high number',
  'topps heritage minors',
  'chronicles',
  'mosaic',
];

export const inserts = ['invicta', 'next level', 'elite series', 'the rookies'];
