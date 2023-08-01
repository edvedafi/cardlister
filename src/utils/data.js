export const isYes = (str) =>
  (typeof str === "boolean" && str) ||
  (typeof str === "string" &&
    ["yes", "YES", "y", "Y", "Yes", "YEs", "YeS", "yES"].includes(str));
export const isNo = (str) =>
  (typeof str === "boolean" && !str) ||
  (typeof str === "string" && ["no", "NO", "n", "N", "No"].includes(str));

export const titleCase = (str) => {
  if (!str) {
    return str;
  }
  try {
    return str
      .split(" ")
      .map((word) => {
        if (word.length > 3 && word.toLowerCase().startsWith("mc")) {
          return "Mc" + word[2].toUpperCase() + word.slice(3).toLowerCase();
        } else {
          return word[0].toUpperCase() + word.slice(1).toLowerCase();
        }
      })
      .join(" ")
      .split(".")
      .map((word) => word[0]?.toUpperCase() + word.slice(1))
      .join(".")
      .split("'")
      .map((word) => word[0]?.toUpperCase() + word.slice(1))
      .join("'");
  } catch (e) {
    console.log("error title casing", str);
    throw e;
  }
};

export const byCardNumber = (a, b) => {
  //extract card number from cardNumber string
  if (
    a.cardNumber &&
    parseInt(a.cardNumber) &&
    b.cardNumber &&
    parseInt(b.cardNumber)
  ) {
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
