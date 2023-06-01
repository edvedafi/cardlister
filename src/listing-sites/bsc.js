async function writeBuySportsCardsOutput(allCards) {
  const years = {};

  //group cards
  Object.values(allCards).forEach(card => {
    if (!years[card.year]) {
      years[card.year] = {};
    }
    let setName = card.setName;
    const addToSetName = (modifier) => {
      if (modifier) {
        setName = `${setName} ${modifier}`;
      }
    }
    addToSetName(card.parallel);
    if (card.insert !== 'Base Set') addToSetName(card.insert);
    if (!years[card.year][setName]) {
      years[card.year][setName] = [];
    }
    years[card.year][setName].push(card);
  });

  //sort all cards in year by cardNumber
  Object.keys(years).forEach(year => {
    Object.keys(years[year]).forEach(setName => {
      years[year][setName].sort((a, b) => parseInt(a.cardNumber) - parseInt(b.cardNumber));
    });
  });

  //write output sorted by year and then setName
  const output = [];
  Object.keys(years).sort((a, b) => parseInt(a) - parseInt(b)).forEach(year => {
    output.push(''); //add blank line between years
    output.push(year);
    Object.keys(years[year]).sort().forEach(setName => {
      years[year][setName].sort((a, b) => {
        //extract card number from cardNumber string
        const aNumber = parseInt(a.cardNumber.match(/\d+/)[0]);
        const bNumber = parseInt(b.cardNumber.match(/\d+/)[0]);
        return aNumber - bNumber;
      }).forEach(card => {
        output.push(`    ${card.year} ${setName} ${card.cardNumber} ${card.player} ${card.price} (${card.quantity})`);
      });
    });
  });
  output.push('');
  try {
    await fs.outputFile('output/bsc.txt', output.join('\n'));
  } catch (err) {
    console.error('Failed to write bsc.txt');
    console.error(err)
    throw err;
  }
}

export default writeBuySportsCardsOutput;
