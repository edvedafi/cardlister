import {
  Logger,
  Product,
  ProductCategory,
  ProductService,
  ProductVariant,
  ProductVariantService,
  type SubscriberArgs,
  type SubscriberConfig,
} from '@medusajs/medusa';
import fs from 'fs-extra';
import eBayApi from 'ebay-api';
import { isNo, isYes, titleCase } from '../utils/data';
import { EbayOfferDetailsWithKeys } from 'ebay-api/lib/types';

export default async function ebayHandler({
  data,
  eventName,
  container,
  pluginOptions,
}: SubscriberArgs<Record<string, any>>) {
  let logger: Logger;
  try {
    logger = container.resolve<Logger>('logger');
    const { variantId, price, quantity } = data;
    const activityId = logger.activity(`eBay Listing Update for ${variantId}: ${quantity}`);
    const logProgress = (text: string) =>
      logger.progress(activityId, `eBay Listing Update for ${product.title} [${productVariant.sku}] :: ${text}`);

    const productVariantService: ProductVariantService = container.resolve('productVariantService');
    const productService: ProductService = container.resolve('productService');
    logger = container.resolve<Logger>('logger');

    const productVariant = await productVariantService.retrieve(variantId);
    const product: Product = await productService.retrieve(productVariant.product_id, {
      relations: ['categories', 'images'],
    });
    const category = product.categories[0];

    const eBay = await loginEbayAPI();

    const offers = await eBay.sell.inventory.getOffers({ sku: productVariant.sku });

    if (offers && offers.offers && offers.offers.length > 0) {
      const offer = offers.offers[0];
      if (quantity === offer.availableQuantity) {
        logger.success(activityId, `ebay::No Updates needed for:: ${product.title}`);
      } else if (quantity === 0) {
        try {
          logProgress('Deleting offer...');
          await eBay.sell.inventory.deleteOffer(offer.offerId);
          logger.success(activityId, `ebay::Success:: ${product.title}`);
        } catch (e) {
          //TODO Need to log this in a handleable way
          logger.failure(activityId, `ebayHandler::deleteOffer::error ${e.meta?.Errors?.ErrorCode || e.message}`);
        }
      } else {
        logProgress('Updating quantity...');
        await eBay.sell.inventory.updateOffer(offer.offerId, { ...offer, availableQuantity: quantity });
        logger.success(activityId, `ebay::Success:: ${product.title}`);
      }
    } else if (quantity > 0) {
      logProgress('Creating new item...');
      const ebayInventoryItem = convertCardToInventory(product, productVariant, category, quantity);
      // @ts-ignore
      await eBay.sell.inventory.createOrReplaceInventoryItem(productVariant.sku, ebayInventoryItem);
      const offer = createOfferForCard(product, productVariant, category, quantity, price);
      let offerId: string;
      try {
        const response = await eBay.sell.inventory.createOffer(offer);
        offerId = response.offerId;
      } catch (e) {
        const error = e.meta?.res?.data.errors[0];
        if (error?.errorId === 25002) {
          offerId = error.parameters[0].value;
          await eBay.sell.inventory.updateOffer(offerId, offer);
        }
      }
      await eBay.sell.inventory.publishOffer(offerId);
      logger.success(activityId, `ebay::Success:: ${product.title}`);
    }
  } catch (error) {
    console.error('ebayHandler::error: ', error);
    throw error;
  }
}

const convertCardToInventory = (
  card: Product,
  variant: ProductVariant,
  category: ProductCategory,
  quantity: number,
) => ({
  availability: {
    // pickupAtLocationAvailability: [
    //   {
    //     availabilityType: 'IN_STOCK',
    //     fulfillmentTime: {
    //       unit: 'BUSINESS_DAY',
    //       value: '1',
    //     },
    //     merchantLocationKey: 'CardLister',
    //     quantity: card.quantity,
    //   },
    // ],
    shipToLocationAvailability: {
      availabilityDistributions: [
        {
          fulfillmentTime: {
            unit: 'BUSINESS_DAY', //'TimeDurationUnitEnum : [YEAR,MONTH,DAY,HOUR,CALENDAR_DAY,BUSINESS_DAY,MINUTE,SECOND,MILLISECOND]',
            value: '1',
          },
          merchantLocationKey: 'default',
          quantity: '1',
        },
      ],
      quantity: quantity,
    },
  },
  country: 'US',
  condition: card.metadata.grade ? 'LIKE_NEW' : 'USED_VERY_GOOD', // could be "2750 :4000" instead?
  //'ConditionEnum : [NEW,LIKE_NEW,NEW_OTHER,NEW_WITH_DEFECTS,MANUFACTURER_REFURBISHED,CERTIFIED_REFURBISHED,EXCELLENT_REFURBISHED,VERY_GOOD_REFURBISHED,GOOD_REFURBISHED,SELLER_REFURBISHED,USED_EXCELLENT,USED_VERY_GOOD,USED_GOOD,USED_ACCEPTABLE,FOR_PARTS_OR_NOT_WORKING]',
  // conditionDescription: 'string',
  // need to support graded as well, this is only ungraded
  conditionDescriptors: card.metadata.grade
    ? [
        {
          name: '27501',
          values: [graderIds[card.metadata.grader as string] || 2750123],
        },
        {
          name: '27502',
          values: [gradeIds[card.metadata.grade as string]],
        },
        {
          name: '27503',
          values: [card.metadata.certNumber],
        },
      ]
    : [
        {
          name: '40001',
          values: ['400011'],
        },
      ],
  packageWeightAndSize: {
    dimensions: {
      height: card.height,
      length: card.length,
      unit: 'INCH',
      width: card.width,
    },
    packageType: 'LETTER',
    // 'PackageTypeEnum : [LETTER,BULKY_GOODS,CARAVAN,CARS,EUROPALLET,EXPANDABLE_TOUGH_BAGS,EXTRA_LARGE_PACK,FURNITURE,INDUSTRY_VEHICLES,LARGE_CANADA_POSTBOX,LARGE_CANADA_POST_BUBBLE_MAILER,LARGE_ENVELOPE,MAILING_BOX,MEDIUM_CANADA_POST_BOX,MEDIUM_CANADA_POST_BUBBLE_MAILER,MOTORBIKES,ONE_WAY_PALLET,PACKAGE_THICK_ENVELOPE,PADDED_BAGS,PARCEL_OR_PADDED_ENVELOPE,ROLL,SMALL_CANADA_POST_BOX,SMALL_CANADA_POST_BUBBLE_MAILER,TOUGH_BAGS,UPS_LETTER,USPS_FLAT_RATE_ENVELOPE,USPS_LARGE_PACK,VERY_LARGE_PACK,WINE_PAK]',
    weight: {
      unit: 'OUNCE',
      value: card.weight,
    },
  },
  product: {
    title: card.title,
    // subtitle: 'string',
    country: 'United States',
    brand: category.metadata.brand,
    description: `${card.description}<br><br>${defaultValues.shippingInfo}`,
    // ean: ['string'],
    // epid: 'string',
    imageUrls: card.images.map(
      (image) => `https://firebasestorage.googleapis.com/v0/b/hofdb-2038e.appspot.com/o/${image.url}?alt=media`,
    ),
    // isbn: ['string'],
    mpn: category.metadata.setName,
    // upc: ['string'],
    // videoIds: ['string'],
    aspects: {
      'Country/Region of Manufacture': ['United States'],
      country: ['United States'],
      type: ['Sports Trading Card'],
      sport: displayOrNA(category.metadata.sport as string),
      Franchise: displayOrNA(card.metadata.teams),
      team: displayOrNA(card.metadata.teams),
      league: displayOrNA(
        {
          mlb: 'Major League (MLB)',
          MLB: 'Major League (MLB)',
          nfl: 'National Football League (NFL)',
          NFL: 'National Football League (NFL)',
          nba: 'National Basketball Association (NBA)',
          NBA: 'National Basketball Association (NBA)',
          nhl: 'National Hockey League (NHL)',
          NHL: 'National Hockey League (NHL)',
        }[category.metadata.league as string],
      ),
      Set: [`${category.metadata.year} ${category.metadata.setName}`],
      Manufacturer: [category.metadata.brand],
      'Year Manufactured': [displayYear(category.metadata.year as string)],
      Season: [displayYear(category.metadata.year as string)],
      Character: card.metadata.player,
      'Player/Athlete': card.metadata.player,
      'Autograph Authentication': displayOrNA(card.metadata.autographed, category.metadata.brand),
      Grade: displayOrNA(card.metadata.grade),
      Graded: booleanText(card.metadata.graded),
      'Autograph Format': displayOrNA(card.metadata.autoFormat),
      'Professional Grader': displayOrNA(card.metadata.grader),
      'Certification Number': displayOrNA(card.metadata.certNumber),
      'Autograph Authentication Number': displayOrNA(card.metadata.certNumber),
      Features: getFeatures(card, category),
      'Parallel/Variety': [
        category.metadata.parallel ||
          (category.metadata.insert && !isNo(category.metadata.insert) ? 'Base Insert' : 'Base Set'),
      ],
      Autographed: booleanText(card.metadata.autographed),
      'Card Name': [getCardName(card, category)],
      'Card Number': [card.metadata.cardNumber],
      'Signed By': displayOrNA(card.metadata.autographed, card.player),
      Material: [card.material],
      'Card Size': [card.metadata.size],
      'Card Thickness': getThickness(card.metadata.thickness as string),
      Language: [category.metadata.language || 'English'],
      'Original/Licensed Reprint': [category.metadata.original || 'Original'],
      Vintage: booleanText(parseInt(card.metadata.year as string) < 1986),
      'Card Condition': [card.metadata.condition || 'Excellent'],
      'Convention/Event': displayOrNA(card.metadata.convention),
      'Insert Set': [card.metadata.insert || 'Base Set'],
      'Print Run': displayOrNA(card.metadata.printRun),
    },
  },
});

const createOfferForCard = (
  card: Product,
  variant: ProductVariant,
  category: ProductCategory,
  quantity: number,
  price: number,
): EbayOfferDetailsWithKeys => ({
  availableQuantity: quantity,
  categoryId: '261328',
  // "charity": {
  //   "charityId": "string",
  //   "donationPercentage": "string"
  // },
  // "extendedProducerResponsibility": {
  //   "ecoParticipationFee": {
  //     "currency": "string",
  //     "value": "string"
  //   },
  //   "producerProductId": "string",
  //   "productDocumentationId": "string",
  //   "productPackageId": "string",
  //   "shipmentPackageId": "string"
  // },
  format: 'FIXED_PRICE', //"FormatTypeEnum : [AUCTION,FIXED_PRICE]",
  hideBuyerDetails: true,
  // includeCatalogProductDetails: true,
  // listingDescription: 'string',
  listingDuration: 'GTC', //"ListingDurationEnum : [DAYS_1,DAYS_3,DAYS_5,DAYS_7,DAYS_10,DAYS_21,DAYS_30,GTC]",
  listingPolicies: {
    bestOfferTerms: {
      // autoAcceptPrice: {
      //   currency: 'USD',
      //   value: card.price,
      // },
      // autoDeclinePrice: {
      //   currency: 'string',
      //   value: 'string',
      // },
      bestOfferEnabled: true,
    },
    // eBayPlusIfEligible: 'boolean',
    fulfillmentPolicyId: '122729485024',
    paymentPolicyId: '173080971024',
    // productCompliancePolicyIds: ['string'],
    // regionalProductCompliancePolicies: {
    //   countryPolicies: [
    //     {
    //       country:
    //         'CountryCodeEnum : [AD,AE,AF,AG,AI,AL,AM,AN,AO,AQ,AR,AS,AT,AU,AW,AX,AZ,BA,BB,BD,BE,BF,BG,BH,BI,BJ,BL,BM,BN,BO,BQ,BR,BS,BT,BV,BW,BY,BZ,CA,CC,CD,CF,CG,CH,CI,CK,CL,CM,CN,CO,CR,CU,CV,CW,CX,CY,CZ,DE,DJ,DK,DM,DO,DZ,EC,EE,EG,EH,ER,ES,ET,FI,FJ,FK,FM,FO,FR,GA,GB,GD,GE,GF,GG,GH,GI,GL,GM,GN,GP,GQ,GR,GS,GT,GU,GW,GY,HK,HM,HN,HR,HT,HU,ID,IE,IL,IM,IN,IO,IQ,IR,IS,IT,JE,JM,JO,JP,KE,KG,KH,KI,KM,KN,KP,KR,KW,KY,KZ,LA,LB,LC,LI,LK,LR,LS,LT,LU,LV,LY,MA,MC,MD,ME,MF,MG,MH,MK,ML,MM,MN,MO,MP,MQ,MR,MS,MT,MU,MV,MW,MX,MY,MZ,NA,NC,NE,NF,NG,NI,NL,NO,NP,NR,NU,NZ,OM,PA,PE,PF,PG,PH,PK,PL,PM,PN,PR,PS,PT,PW,PY,QA,RE,RO,RS,RU,RW,SA,SB,SC,SD,SE,SG,SH,SI,SJ,SK,SL,SM,SN,SO,SR,ST,SV,SX,SY,SZ,TC,TD,TF,TG,TH,TJ,TK,TL,TM,TN,TO,TR,TT,TV,TW,TZ,UA,UG,UM,US,UY,UZ,VA,VC,VE,VG,VI,VN,VU,WF,WS,YE,YT,ZA,ZM,ZW]',
    //       policyIds: ['string'],
    //     },
    //   ],
    // },
    // regionalTakeBackPolicies: {
    //   countryPolicies: [
    //     {
    //       country:
    //         'CountryCodeEnum : [AD,AE,AF,AG,AI,AL,AM,AN,AO,AQ,AR,AS,AT,AU,AW,AX,AZ,BA,BB,BD,BE,BF,BG,BH,BI,BJ,BL,BM,BN,BO,BQ,BR,BS,BT,BV,BW,BY,BZ,CA,CC,CD,CF,CG,CH,CI,CK,CL,CM,CN,CO,CR,CU,CV,CW,CX,CY,CZ,DE,DJ,DK,DM,DO,DZ,EC,EE,EG,EH,ER,ES,ET,FI,FJ,FK,FM,FO,FR,GA,GB,GD,GE,GF,GG,GH,GI,GL,GM,GN,GP,GQ,GR,GS,GT,GU,GW,GY,HK,HM,HN,HR,HT,HU,ID,IE,IL,IM,IN,IO,IQ,IR,IS,IT,JE,JM,JO,JP,KE,KG,KH,KI,KM,KN,KP,KR,KW,KY,KZ,LA,LB,LC,LI,LK,LR,LS,LT,LU,LV,LY,MA,MC,MD,ME,MF,MG,MH,MK,ML,MM,MN,MO,MP,MQ,MR,MS,MT,MU,MV,MW,MX,MY,MZ,NA,NC,NE,NF,NG,NI,NL,NO,NP,NR,NU,NZ,OM,PA,PE,PF,PG,PH,PK,PL,PM,PN,PR,PS,PT,PW,PY,QA,RE,RO,RS,RU,RW,SA,SB,SC,SD,SE,SG,SH,SI,SJ,SK,SL,SM,SN,SO,SR,ST,SV,SX,SY,SZ,TC,TD,TF,TG,TH,TJ,TK,TL,TM,TN,TO,TR,TT,TV,TW,TZ,UA,UG,UM,US,UY,UZ,VA,VC,VE,VG,VI,VN,VU,WF,WS,YE,YT,ZA,ZM,ZW]',
    //       policyIds: ['string'],
    //     },
    //   ],
    // },
    returnPolicyId: process.env.EBAY_RETURN_POLICY_ID,
    // shippingCostOverrides: [
    //   {
    //     additionalShippingCost: {
    //       currency: 'string',
    //       value: 'string',
    //     },
    //     priority: 'integer',
    //     shippingCost: {
    //       currency: 'string',
    //       value: 'string',
    //     },
    //     shippingServiceType: 'ShippingServiceTypeEnum : [DOMESTIC,INTERNATIONAL]',
    //     surcharge: {
    //       currency: 'string',
    //       value: 'string',
    //     },
    //   },
    // ],
    // takeBackPolicyId: 'string',
  },
  // listingStartDate: 'string',
  // lotSize: 'integer',
  marketplaceId: 'EBAY_US',
  //'MarketplaceEnum : [EBAY_US,EBAY_MOTORS,EBAY_CA,EBAY_GB,EBAY_AU,EBAY_AT,EBAY_BE,EBAY_FR,EBAY_DE,EBAY_IT,EBAY_NL,EBAY_ES,EBAY_CH,EBAY_TW,EBAY_CZ,EBAY_DK,EBAY_FI,EBAY_GR,EBAY_HK,EBAY_HU,EBAY_IN,EBAY_ID,EBAY_IE,EBAY_IL,EBAY_MY,EBAY_NZ,EBAY_NO,EBAY_PH,EBAY_PL,EBAY_PT,EBAY_PR,EBAY_RU,EBAY_SG,EBAY_ZA,EBAY_SE,EBAY_TH,EBAY_VN,EBAY_CN,EBAY_PE,EBAY_JP]',
  merchantLocationKey: 'CardLister',
  pricingSummary: {
    // auctionReservePrice: {
    //   currency: 'string',
    //   value: 'string',
    // },
    // auctionStartPrice: {
    //   currency: 'string',
    //   value: 'string',
    // },
    // minimumAdvertisedPrice: {
    //   currency: 'string',
    //   value: 'string',
    // },
    // originallySoldForRetailPriceOn: 'SoldOnEnum : [ON_EBAY,OFF_EBAY,ON_AND_OFF_EBAY]',
    // originalRetailPrice: {
    //   currency: 'string',
    //   value: 'string',
    // },
    price: {
      currency: 'USD',
      value: `${price / 100}`,
    },
    pricingVisibility: 'NONE', //'MinimumAdvertisedPriceHandlingEnum : [NONE,PRE_CHECKOUT,DURING_CHECKOUT]',
  },
  // quantityLimitPerBuyer: 'integer',
  // regulatory: {
  //   energyEfficiencyLabel: {
  //     imageDescription: 'string',
  //     imageURL: 'string',
  //     productInformationSheet: 'string',
  //   },
  //   hazmat: {
  //     component: 'string',
  //     pictograms: ['string'],
  //     signalWord: 'string',
  //     statements: ['string'],
  //   },
  //   repairScore: 'number',
  // },
  // secondaryCategoryId: 'string',
  sku: variant.sku,
  storeCategoryNames: [category.metadata.sport as string],
  // tax: {
  //   applyTax: 'boolean',
  //   thirdPartyTaxCategory: 'string',
  //   vatPercentage: 'number',
  // },
});

export const displayYear = (year: string): string => (year.indexOf('-') > -1 ? year.split('-')[0] : year);

export const getThickness = (thickness: string): string[] => [
  thickness.toLowerCase().indexOf('pt') < 0 ? `${thickness} Pt.` : thickness,
];

export const getFeatures = (card: Product, category: ProductCategory) => {
  let features: string[] = (card.metadata.features as string[]) || [];
  if (!features || (features.length === 1 && isNo(features[0])) || features[0] === '') {
    features = [];
  }

  const parallel: string = category.metadata.parallel as string;
  if (parallel && !isNo(parallel)) {
    features.push('Parallel/Variety');
    if (parallel.toLowerCase().indexOf('refractor') > -1) {
      features.push('Refractor');
    }
  }

  if (category.metadata.insert && !isNo(category.metadata.insert)) {
    features.push('Insert');
  }

  if (card.metadata.printRun && (card.metadata.printRun as number) > 0) {
    features.push('Serial Numbered');
  }

  if (features.includes('RC')) {
    features.push('Rookie');
  }

  if (features.length === 0) {
    features.push('Base Set');
  }

  return features;
};

const booleanText = (val: string | boolean | unknown): [string] => [isYes(val) ? 'Yes' : 'No'];

const displayOrNA = (testValue: string | boolean | unknown, displayValue: any = testValue): [string] => {
  if (Array.isArray(displayValue) && displayValue.length > 0) {
    return displayValue.map(titleCase) as [string];
  } else {
    return [testValue && !isNo(testValue.toString()) ? titleCase(displayValue) : 'N/A'];
  }
};

const refreshFile = '.ebay';
const getRefreshToken = async () => {
  try {
    if (fs.existsSync(refreshFile)) {
      return fs.readJSON(refreshFile);
    }
  } catch (e) {
    console.error('Reading Refresh Token Failed');
    console.error(e);
  }
};

const writeRefreshToken = async (refreshToken) => {
  try {
    await fs.writeJSON(refreshFile, refreshToken);
  } catch (e) {
    console.error('Writing Refresh Token Failed');
    console.error(e);
  }
};

export const loginEbayAPI = async () => {
  const eBay = eBayApi.fromEnv();

  eBay.OAuth2.setScope(scopes);

  let token = await getRefreshToken();
  console.log('token', token);
  if (!token) {
    throw new Error('No eBay Token Found');
    //
    // const app = express();
    //
    // let resolve;
    // const authCode = new Promise((_resolve) => {
    //   resolve = _resolve;
    // });
    // app.get('/oauth', function(req, res) {
    //   resolve(req.query.code);
    //   res.end('');
    // });
    // const server = app.listen(3000);
    //
    // // console.log(eBay.OAuth2.generateAuthUrl());
    // await open(eBay.OAuth2.generateAuthUrl());
    // const code = await authCode;
    // // console.log('code', code);
    //
    // try {
    //   token = await eBay.OAuth2.getToken(code);
    //   await writeRefreshToken(token);
    // } catch (e) {
    //   console.error(e);
    //   throw e;
    // } finally {
    //   server.close();
    // }
  }

  eBay.OAuth2.setCredentials(token);

  // console.log('Logged in successfully!');
  return eBay;
};

const defaultValues = {
  action: 'Add',
  category: '261328',
  storeCategory: '10796387017',

  // Ebay Condition guide: https://developer.ebay.com/devzone/merchant-products/mipng/user-guide-en/content/condition-descriptor-ids-for-trading-cards.html
  // ungraded
  condition: '4000',

  //graded
  //condition: "3000",
  // conditionDetail: "40001",
  graded: 'No',
  grade: 'Not Graded',
  grader: 'Not Graded',
  parallel: 'Base',
  features: 'Base',
  team: 'N/A',
  autographed: 'No',
  // certNumber: "Not Graded",
  cardType: 'Sports Trading Card',
  autoAuth: 'N/A',
  signedBy: 'N/A',
  country: 'United States',
  original: 'Original',
  language: 'English',
  shippingInfo:
    'All shipping is with quality (though often used) top loaders, securely packaged and protected in an envelope if you choose the low cost Ebay Standard Envelope option. If you would like true tracking and a bubble mailer for further protection please choose the First Class Mail option. Please know your card will be packaged equally securely in both options!',
  format: 'FixedPrice',
  duration: 'GTC',
  shippingFrom: 'Green Bay, WI',
  shippingZip: '54311',
  shippingTime: '1',
  returns: 'ReturnsAccepted',
  returnPolicy: '30DaysMoneyBack',
  shippingPolicy: 'PWE_or_BMWT',
  acceptOffers: 'TRUE',
  weightUnit: 'LB',
  packageType: 'Letter',
};

const scopes = [
  'https://api.ebay.com/oauth/api_scope',
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  // 'https://api.ebay.com/oauth/api_scope/sell.account',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly',
  // 'https://api.ebay.com/oauth/api_scope/commerce.catalog.readonly',
  // 'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly',
  // 'https://api.ebay.com/oauth/api_scope/commerce.identity.email.readonly',
  // 'https://api.ebay.com/oauth/api_scope/commerce.identity.phone.readonly',
  // 'https://api.ebay.com/oauth/api_scope/commerce.identity.address.readonly',
  // 'https://api.ebay.com/oauth/api_scope/commerce.identity.name.readonly',
  // 'https://api.ebay.com/oauth/api_scope/commerce.identity.status.readonly',
  // 'https://api.ebay.com/oauth/api_scope/sell.finances',
  // 'https://api.ebay.com/oauth/api_scope/sell.item.draft',
  ////////////'https://api.ebay.com/oauth/api_scope/sell.item',
  // 'https://api.ebay.com/oauth/api_scope/sell.reputation',
];

const gradeIds = {
  10: 275020,
  9.5: 275021,
  9: 275022,
  8.5: 275023,
  8: 275024,
  7.5: 275025,
  7: 275026,
  6.5: 275027,
  6: 275028,
  5.5: 275029,
  5: 2750210,
  4.5: 2750211,
  4: 2750212,
  3.5: 2750213,
  3: 2750214,
  2.5: 2750215,
  2: 2750216,
  1.5: 2750217,
  1: 2750218,
  Authentic: 2750219,
  'Authentic Altered': 2750220,
  'Authentic - Trimmed': 2750221,
  'Authentic - Coloured': 2750222,
};

const graderIds = {
  PSA: 275010,
  BCCG: 275011,
  BVG: 275012,
  BGS: 275013,
  CSG: 275014,
  CGC: 275015,
  SGC: 275016,
  KSA: 275017,
  GMA: 275018,
  HGA: 275019,
  ISA: 2750110,
  PCA: 2750111,
  GSG: 2750112,
  PGS: 2750113,
  MNT: 2750114,
  TAG: 2750115,
  Rare: 2750116,
  RCG: 2750117,
  PCG: 2750118,
  Ace: 2750119,
  CGA: 2750120,
  TCG: 2750121,
  ARK: 2750122,
};

export const config: SubscriberConfig = {
  event: 'ebay-listing-update',
  context: {
    subscriberId: 'ebay-handler',
  },
};

//TODO: This is all moved to product

function getCardName(card: Product, category: ProductCategory): string {
  const add = (info: any, modifier?: any) => {
    if (info === undefined || info === null || info === '' || isNo(info)) {
      return '';
    } else if (modifier) {
      return ` ${info} ${modifier}`;
    } else {
      return ` ${info}`;
    }
  };

  //generate a 60 character card name
  const maxCardNameLength = 60;
  let cardName = card.title.replace(' | ', ' ');
  let insert = add(category.metadata.insert);
  let parallel = add(category.metadata.parallel);
  if (cardName.length > maxCardNameLength) {
    cardName =
      `${category.metadata.year} ${category.metadata.brand} ${category.metadata.setName}${insert}${parallel} ${card.metadata.player}`.replace(
        ' | ',
        ' ',
      );
  }
  if (cardName.length > maxCardNameLength) {
    cardName =
      `${category.metadata.year} ${category.metadata.setName}${insert}${parallel} ${card.metadata.player}`.replace(
        ' | ',
        ' ',
      );
  }
  if (cardName.length > maxCardNameLength) {
    cardName = `${category.metadata.year} ${category.metadata.setName}${insert}${parallel}`;
  }
  if (cardName.length > maxCardNameLength) {
    cardName = `${category.metadata.setName}${insert}${parallel}`;
  }
  cardName = cardName.replace(/ {2}/g, ' ').replace(' | ', ' ');
  //
  // if (cardName.length > maxCardNameLength) {
  //   cardName = await ask('Card Name', cardName, {
  //     maxLength: maxCardNameLength,
  //   });
  // }

  return cardName;
}
