import { ask } from "./utils/ask.js";
import { getBulkCardData } from "./card-data/cardData.js";

async function collectBulkListings(savedAnswers, setData) {
  console.log("Enter all Bulk Listings Now. Quit on blank card number.");
  if (savedAnswers.length > 0) {
    console.log(
      savedAnswers.bulk.reduce((output, card) => `${output} ${card.cardNumber},`, "Bulk Listings exist for: "),
    );
  }
  let lastCardNumber = "start";
  const allCards = savedAnswers.bulk || [];
  while (lastCardNumber && lastCardNumber !== "") {
    lastCardNumber = await getBulkCardData(allCards, setData);
  }
  return allCards;
}

export default collectBulkListings;
