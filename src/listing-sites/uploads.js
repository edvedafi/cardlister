const createKey = (card) =>
  `${card.sport}|${card.year.indexOf('-') > -1 ? card.year.substring(0, card.year.indexOf('-')) : card.year}|${
    card.manufacture
  }|${card.setName}|${card.insert || ''}|${card.parallel || ''}`;
export const parseKey = (key) => {
  const [sport, year, manufacture, setName, insert, parallel] = key.split('|');
  return {
    sport,
    year,
    manufacture,
    setName,
    insert,
    parallel,
  };
};

export const createGroups = (allCards = {}, bulk = []) => {
  const groups = {};
  const addCardsToGroup = (cards) =>
    cards.forEach((card) => {
      if (card.quantity && card.quantity > 0 && Number.parseInt(card.quantity) === Number.parseFloat(card.quantity)) {
        const key = createKey(card);
        if (!groups[key]) {
          groups[key] = {};
        }
        if (!groups[key][card.cardNumber]) {
          groups[key][card.cardNumber] = card;
        }
      }
    });
  addCardsToGroup(Object.values(allCards));
  addCardsToGroup(bulk);
  Object.keys(groups).forEach((key) => {
    groups[key] = Object.values(groups[key]);
  });
  return groups;
};
