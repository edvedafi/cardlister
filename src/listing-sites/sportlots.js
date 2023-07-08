import { byCardNumber } from "../utils/data.js";

async function writeSportLotsOutput(allCards) {
  const years = {};

  //group cards
  Object.values(allCards).forEach((card) => {
    if (!years[card.year]) {
      years[card.year] = {};
    }
    let setName = card.setName;
    const addToSetName = (modifier) => {
      if (modifier) {
        setName = `${setName} ${modifier}`;
      }
    };
    addToSetName(card.parallel);
    addToSetName(card.insert);
    if (!years[card.year][setName]) {
      years[card.year][setName] = [];
    }
    years[card.year][setName].push(card);
  });

  //sort all cards in year by cardNumber
  Object.keys(years).forEach((year) => {
    Object.keys(years[year]).forEach((setName) => {
      years[year][setName].sort(
        (a, b) => parseInt(a.cardNumber) - parseInt(b.cardNumber),
      );
    });
  });

  //write output sorted by year and then setName
  const output = [];
  Object.keys(years)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .forEach((year) => {
      output.push(""); //add blank line between years
      output.push(year);
      Object.keys(years[year])
        .sort()
        .forEach((setName) => {
          output.push(`  ${setName}`);
          years[year][setName].sort(byCardNumber).forEach((card) => {
            output.push(
              `    ${card.cardNumber} ${card.player} ${card.price} (${card.quantity})`,
            );
          });
        });
    });
  output.push("");
  try {
    await fs.outputFile("output/sportlots.txt", output.join("\n"));
  } catch (err) {
    console.error("Failed to write sportlots.txt");
    console.error(err);
    throw err;
  }
}

export default writeSportLotsOutput;
