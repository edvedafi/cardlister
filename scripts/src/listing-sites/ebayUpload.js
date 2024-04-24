// const EbayAuthToken = require('ebay-oauth-nodejs-client');
import EbayAuthToken from "ebay-oauth-nodejs-client";

const scopes = [
  "https://api.ebay.com/oauth/api_scope",
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.item",
];

async function uploaddToEbay(allCards) {
  try {
    // Step 1: Obtain OAuth token from eBay
    const config = {
      clientId: process.env.EBAY_CLIENT_ID,
      clientSecret: process.env.EBAY_CLIENT_SECRET,
      // ruName: process.env.EBAY_RUNNAME,
      redirectUri: process.env.EBAY_REDIRECT_URI,
      production: false, // Set this to true for production environment
    };
    console.log(config);
    const ebayAuth = new EbayAuthToken(config);

    const ebayToken = await ebayAuth.generateUserAuthorizationUrl(
      "SANDBOX",
      scopes,
    );

    // Step 2: Make API call to save a new listing for each record in allCards
    for (const card of allCards) {
      const response = await fetch(
        "https://api.ebay.com/sell/listing/v1/item",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ebayToken.accessToken}`,
          },
          body: JSON.stringify({
            title: card.title,
            price: card.price,
            // Include other relevant listing details here
          }),
        },
      );

      const result = await response.json();
      console.log("Listing created:", result);
    }

    console.log("All listings created successfully.");
  } catch (error) {
    console.error("Error creating listings:", error);
  }
}

export default uploaddToEbay;
