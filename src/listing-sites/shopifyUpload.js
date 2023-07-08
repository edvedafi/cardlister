//write a function that takes in a file path and an array of objects that will be written as a csv to the file
import { isNo, isYes, titleCase } from "../utils/data.js";
import "@shopify/shopify-api/adapters/node";
import { shopifyApi } from "@shopify/shopify-api";

async function uploadToShopify(data) {
  const shopifyConfig = {
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    isCustomStoreApp: true,
    adminApiAccessToken: process.env.SHOPIFY_ACCESS_TOKEN,
    // scopes: ['write_products'],
    hostName: process.env.SHOPIFY_URL,
  };
  console.log("shopifyConfig", shopifyConfig);
  const shopify = shopifyApi({
    ...shopifyConfig,
  });
  const session = shopify.session.customAppSession(process.env.SHOPIFY_URL);

  const client = new shopify.clients.Graphql({ session });

  await Promise.all(
    Object.values(data).map(async (card) => {
      const query = `mutation {
      productCreate(
        input: {
          descriptionHtml: "${getDescription(card)}",
          handle: "${getHandle(card)}",
          images: [${card.pics.split("|").map(
            (image, index) => `{
              altText: "${
                index === 0
                  ? `Front of ${card.year} ${card.setName} #${card.cardNumber} ${card.player}`
                  : `Back of ${card.year} ${card.setName} #${card.cardNumber} ${card.player}`
              }",
              src: "${image}"
            }`,
          )}],
          productType: "Collectible Trading Cards",
          productCategory: {
            productTaxonomyNodeId: "gid://shopify/ProductTaxonomyNode/532"
          },
          seo: {
            description: "${getDescription(card)}",
            title: "${card.title}"
          },
          status: ACTIVE,
          tags: [${getTags(card)}],
          title: "${card.title}",
          ${getCollections(card)}
          variants: [
            {
              inventoryPolicy: DENY,
              inventoryQuantities: [
                {
                  availableQuantity: ${card.quantity}
                  locationId: "gid://shopify/Location/${
                    process.env.SHOPIFY_LOCATION_ID
                  }"
                }
              ],
              inventoryItem: {
                tracked: true
              },
              price: "${card.price}",
              requiresShipping: true,
              taxable: true,
              weight: 1.0,
              weightUnit: OUNCES
            }
          ],
          vendor: "${card.manufacture}"
        }
      ) {
        product {
          id
        }
        userErrors {
          field
          message
        }
      }
    }`;
      // console.log(query)

      try {
        const simpleSave = await client.query({
          data: query,
        });

        if (simpleSave.body.data.productCreate.userErrors.length > 0) {
          console.log("Failed to save to Shopify - userErrors");
          throw simpleSave.body.data.productCreate.userErrors;
        }

        // console.log(JSON.stringify(simpleSave.body, null, 2));
      } catch (e) {
        console.log("Failed to save to Shopify");
        console.log(e);
        console.log("query: ", query);
      }
    }),
  );
}

const getTags = (card) => {
  let tags = "";
  const addTag = (tag) => {
    if (tag && tag.trim().length > 0 && tag !== "undefined") {
      if (tags.length > 0) {
        tags = `${tags}, "${tag.trim()}"`;
      } else {
        tags = `"${tag.trim()}"`;
      }
    }
  };

  if (isYes(card.autographed)) {
    addTag("Autographed");
  }

  if (parseInt(card.year) < 1987) {
    addTag("Vintage");
  } else if (parseInt(card.year) > 2000) {
    addTag("Modern");
  } else if (parseInt(card.year) > 2020) {
    addTag("Ultra Modern");
  }

  if (card.thickness.indexOf("pt") < 0) {
    card.thickness = `${card.thickness}pt`;
  }
  addTag(card.thickness);

  if (isYes(card.parallel)) {
    addTag("Parallel");
  } else if (card.parallel && card.parallel.length > 0) {
    addTag("Parallel");
    addTag(titleCase(card.parallel));
  }

  if (isYes(card.insert)) {
    addTag("Insert");
  } else if (card.insert && card.insert.length > 0) {
    addTag("Insert");
    addTag(titleCase(card.insert));
  }

  if (card.printRun && card.printRun > 0) {
    addTag("Serial Numbered");
  }

  if (card.features && !isNo(card.features) && card.features.length > 0) {
    card.features.split("|").forEach(addTag);
  }

  if (card.league && card.league.length > 0) {
    addTag(card.league.toUpperCase());
  }

  if (card.sport) {
    card.sport = titleCase(card.sport);
    addTag(card.sport);
    card.type = `${card.sport} Card`;
  } else {
    card.sport = "N/A";
    card.type = `Sports Card`;
  }

  addTag(card.year);
  addTag(card.setName);
  addTag(card.player);
  addTag(card.team.display);
  if (card.grade) {
    addTag(card.grade);
  }

  return tags;
};

const getDescription = (card) =>
  `<p><strong>Year:</strong> ${card.year}</p><p><strong>Manufacture:</strong> ${card.manufacture}</p><p><strong>Set:</strong> ${card.setName}</p><p><strong>Insert:</strong> ${card.insert}</p><p><strong>Parallel:</strong> ${card.parallel}</p><p><strong>Card Number:</strong> #${card.cardNumber}</p><p><strong>Player:</strong> ${card.player}</p><p><strong>Team:</strong> ${card.team.display}</p><p><strong>Sport:</strong> ${card.sport}</p>`;

const getHandle = (card) =>
  `${card.directory}-${card.cardNumber}-${card.player}`
    .replaceAll(" ", "-")
    .replaceAll("/", "-");

const getCollections = (card) => {
  const collections = [];
  if (card.price > 1) {
    collections.push("gid://shopify/Collection/445662953780");
  }
  if (collections.length > 0) {
    return `collectionsToJoin: [${collections.reduce(
      (str, collection) =>
        str ? `"${collection}"` : `${str}, "${collection}"`,
      "",
    )}], `;
  } else {
    return "";
  }
};

export default uploadToShopify;
