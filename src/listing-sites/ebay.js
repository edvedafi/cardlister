//write a function that takes in a file path and an array of objects that will be written as a csv to the file
import { createObjectCsvWriter } from 'csv-writer';
import { isNo, isYes } from '../utils/data.js';
import { gradeIds, graderIds } from './ebayConstants.js';
import open from 'open';
import eBayApi from 'ebay-api';

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

const filePath = 'output/ebay.csv';

async function writeEbayFile(data) {
  console.log(chalk.magenta('Ebay Starting Upload'));
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      {
        id: 'action',
        title: '*Action(SiteID=US|Country=US|Currency=USD|Version=1193|CC=UTF-8)',
      },
      { id: 'customLabel', title: 'CustomLabel' },
      { id: 'category', title: '*Category' },
      { id: 'storeCategory', title: 'StoreCategory' },
      { id: 'title', title: '*Title' },
      { id: 'condition', title: '*ConditionID' },
      { id: 'graded', title: '*C:Graded' },
      { id: 'sport', title: '*C:Sport' },
      { id: 'player', title: '*C:Player/Athlete' },
      { id: 'parallel', title: '*C:Parallel/Variety' },
      { id: 'manufacture', title: '*C:Manufacturer' },
      { id: 'year', title: 'C:Season' },
      { id: 'features', title: '*C:Features' },
      { id: 'setName', title: '*C:Set' },
      { id: 'grade', title: '*C:Grade' },
      { id: 'grader', title: '*C:Professional Grader' },
      { id: 'teamDisplay', title: '*C:Team' },
      { id: 'league', title: '*C:League' },
      { id: 'autographed', title: '*C:Autographed' },
      { id: 'conditionDetail', title: 'CD:Card Condition - (ID: 40001)' },
      { id: 'graderID', title: 'CD:Card Condition - (ID: 27501)' },
      { id: 'gradeID', title: 'CD:Card Condition - (ID: 27502)' },
      // { id: "certNumber", title: "CD:Card Condition - (ID: 27503)" },
      { id: 'cardName', title: '*C:Card Name' },
      { id: 'cardNumber', title: '*C:Card Number' },
      { id: 'certNumber', title: '*C:Certification Number' },
      { id: 'cardType', title: '*C:Type' },
      { id: 'signedBy', title: 'C:Signed By' },
      { id: 'autoAuth', title: 'C:Autograph Authentication' },
      { id: 'yearManufactured', title: 'C:Year Manufactured' },
      { id: 'size', title: 'C:Card Size' },
      { id: 'country', title: 'C:Country/Region of Manufacture' },
      { id: 'material', title: 'C:Material' },
      { id: 'autoFormat', title: 'C:Autograph Format' },
      { id: 'vintage', title: 'C:Vintage' },
      { id: 'original', title: 'C:Original/Licensed Reprint' },
      { id: 'language', title: 'C:Language' },
      { id: 'thickness', title: 'C:Card Thickness' },
      { id: 'insert', title: 'C:Insert Set' },
      { id: 'printRun', title: 'C:Print Run' },
      { id: 'pics', title: 'PicURL' },
      { id: 'description', title: '*Description' },
      { id: 'format', title: '*Format' },
      { id: 'duration', title: '*Duration' },
      { id: 'price', title: '*StartPrice' },
      { id: 'autoOffer', title: 'BestOfferAutoAcceptPrice' },
      { id: 'minOffer', title: 'MinimumBestOfferPrice' },
      { id: 'returns', title: '*ReturnsAcceptedOption' },
      { id: 'returnPolicy', title: 'ReturnProfileName' },
      { id: 'acceptOffers', title: 'BestOfferEnabled' },
      { id: 'shippingPolicy', title: 'ShippingProfileName' },
      { id: 'shippingFrom', title: '*Location' },
      { id: 'shippingZip', title: 'PostalCode' },
      { id: 'shippingTime', title: '*DispatchTimeMax' },
      { id: 'weightUnit', title: 'WeightUnit' },
      { id: 'lbs', title: 'WeightMajor' },
      { id: 'oz', title: 'WeightMinor' },
      { id: 'length', title: 'PackageLength' },
      { id: 'width', title: 'PackageWidth' },
      { id: 'depth', title: 'PackageDepth' },
      { id: 'packageType', title: 'PackageType' },
      { id: 'quantity', title: '*Quantity' },
      { id: 'numberOfCards', title: '*C:Number of Cards' },
    ],
  });

  //ebay mapping logic
  let csvData = Object.values(data).map((card) => {
    const addFeature = (feature) => {
      if (card.features && card.features.length > 0) {
        card.features = `${card.features}|${feature}`;
      } else {
        card.features = feature;
      }
    };

    if (isYes(card.autographed)) {
      card.signedBy = card.player;
      card.autoAuth = card.manufacture;
      card.autographed = 'Yes';
      if (['Label', 'Sticker'].includes(card.autoFormat)) {
        card.autoFormat = 'Label or Sticker';
      }
    } else {
      card.autographed = 'No';
    }

    card.yearManufactured = card.year.indexOf('-') > -1 ? card.year.split('-')[0] : card.year;
    if (parseInt(card.yearManufactured) < 1986) {
      card.vintage = 'Yes';
    } else {
      card.vintage = 'No';
    }

    if (card.thickness.indexOf('pt') < 0) {
      card.thickness = `${card.thickness}pt`;
    }

    if (!card.parallel || isNo(card.parallel)) {
      if (card.insert && !isNo(card.insert)) {
        card.parallel = 'Base Insert';
      } else {
        card.parallel = 'Base Set';
      }
    } else {
      addFeature('Parallel/Variety');
      if (card.parallel.toLowerCase().indexOf('refractor') > -1) {
        addFeature('Refractor');
      }
    }

    if (!card.insert || isNo(card.insert)) {
      card.insert = 'Base Set';
    } else {
      addFeature('Insert');
    }

    if (card.printRun && card.printRun > 0) {
      addFeature('Serial Numbered');
    }

    if (!card.features || isNo(card.features)) {
      card.features = 'Base';
    }

    card.features = card.features.replace('RC', 'Rookie');

    card.league = card.league
      ? {
          mlb: 'Major League (MLB)',
          nfl: 'National Football League (NFL)',
          nba: 'National Basketball Association (NBA)',
          nhl: 'National Hockey League (NHL)',
        }[card.league?.toLowerCase()] || card.league
      : 'N/A';

    card.sport = card.sport ? card.sport.slice(0, 1).toUpperCase() + card.sport.slice(1).toLowerCase() : 'N/A';

    card.description = card.description || `${card.longTitle}<br><br>${defaultValues.shippingInfo}`;

    card.setName = `${card.year} ${card.setName}`;

    if (!card.teamDisplay) {
      card.teamDisplay = card.team?.display || 'N/A';
    }

    if (isYes(card.graded)) {
      card.condition = '2750';
      card.gradeID = gradeIds[card.grade];
      card.graderID = graderIds[card.grader] || 2750123;
      card.certNumber = `"${card.certNumber}"`;
    } else {
      card.conditionDetail = '400011'; //Excellent
    }

    return card;
  });

  // merge defaults
  console.log('ebay data size: ', chalk.green(csvData.length));
  csvData = csvData.map((card) => ({ ...defaultValues, ...card }));

  try {
    await csvWriter.writeRecords(csvData);
  } catch (e) {
    console.log('Failed to write ebay file: ', filePath);
    console.log(e);
    throw e;
  }

  if (csvData.length > 0) {
    await uploadEbayFile();
  }
  console.log(chalk.magenta('Ebay Completed Upload'));
}

import { Builder, Browser, By, until } from 'selenium-webdriver';
import { ask } from '../utils/ask.js';
import { setTimeout } from 'timers/promises';
import chalk from 'chalk';
import { useWaitForElement } from './uploads.js';
import express from 'express';
import fs from 'fs-extra';
import axios from 'axios';

export const uploadEbayFile = async () => {
  let driver;

  async function signIn(waitForElement) {
    let signInButton = await Promise.race([waitForElement(By.id('userid')), waitForElement(By.xpath('//iframe'))]);

    const id = await signInButton.getAttribute('id');
    console.log('sign in id', id);
    if (id === 'userid') {
      //do nothing because we found the right button
    } else {
      const checkbox = await waitForElement(By.id('checkbox'));
      await checkbox.click();
      console.log('clicked checkbox');
      signInButton = waitForElement(By.id('userid'));
    }

    await signInButton.sendKeys(process.env.EBAY_ID);
    await driver.findElement(By.id('signin-continue-btn')).click();

    const passwordField = await waitForElement(By.id('pass'));
    await passwordField.sendKeys(process.env.EBAY_PASS);
    await driver.findElement(By.id('sgnBt')).click();
  }

  try {
    driver = await new Builder().forBrowser(Browser.CHROME).build();
    await driver.get('https://www.ebay.com/');
    await driver.findElement(By.linkText('Sign in')).click();
    // await setTimeout(10000);

    const waitForElement = useWaitForElement(driver);
    console.log('waiting for element sign in');
    await signIn(waitForElement);
    // await signIn(waitForElement);

    await driver.get('https://www.ebay.com/sh/lst/active');
    const uploadButton = await waitForElement(By.xpath('//button[text()="Upload"]'));
    try {
      await uploadButton.click();
    } catch (e) {
      //scroll right and down 50px
      await driver.executeScript('window.scrollBy(50,50)');
      await uploadButton.click();
    }

    await driver.findElement(By.xpath("//input[@type='file']")).sendKeys(`${process.cwd()}/${filePath}`);

    const resultTitle = await waitForElement(By.id('Listing-popup-title'));
    const result = await resultTitle.getText();
    if (result === 'Not everything was uploaded.') {
      await ask('Press any key to continue...');
    } else {
      console.log(chalk.green(result));
    }
  } catch (e) {
    console.log(e);
    await ask('Press any key to continue...');
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
};

const scopes = [
  'https://api.ebay.com/oauth/api_scope',
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  // 'https://api.ebay.com/oauth/api_scope/sell.account',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
  // 'https://api.ebay.com/oauth/api_scope/commerce.catalog.readonly',
  // 'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly',
  // 'https://api.ebay.com/oauth/api_scope/commerce.identity.email.readonly',
  // 'https://api.ebay.com/oauth/api_scope/commerce.identity.phone.readonly',
  // 'https://api.ebay.com/oauth/api_scope/commerce.identity.address.readonly',
  // 'https://api.ebay.com/oauth/api_scope/commerce.identity.name.readonly',
  // 'https://api.ebay.com/oauth/api_scope/commerce.identity.status.readonly',
  // 'https://api.ebay.com/oauth/api_scope/sell.finances',
  'https://api.ebay.com/oauth/api_scope/sell.item.draft',
  'https://api.ebay.com/oauth/api_scope/sell.item',
  // 'https://api.ebay.com/oauth/api_scope/sell.reputation',
];
const refreshFile = `ebay.auth.json`;
const getRefreshToken = async () => {
  try {
    if (fs.existsSync(refreshFile)) {
      const refreshData = await fs.readJSON(refreshFile);
      console.log('refreshData', refreshData);
      if (refreshData.expires > Date.now()) {
        return refreshData.refresh_token;
      } else {
        console.log('refresh token expired');
      }
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
  const refreshToken = await getRefreshToken();
  let accessToken;
  const ebayAuthToken = new EbayAuthToken({
    filePath: 'ebay.json', // input file path.
  });
  if (refreshToken) {
    console.log('refreshToken', refreshToken);
    const response = await ebayAuthToken.getAccessToken('SANDBOX', refreshToken, scopes);
    const responseJson = JSON.parse(response);

    if (responseJson.access_token) {
      accessToken = responseJson.access_token;
    } else {
      console.log('Failed to get access token from refresh token');
      console.log(responseJson);
    }
  }

  if (!accessToken) {
    const app = express();

    let resolve;
    const p = new Promise((_resolve) => {
      resolve = _resolve;
    });
    app.get('/oauth', function (req, res) {
      resolve(req.query.code);
      res.end('');
    });
    const server = await app.listen(3000);

    const authUrl = ebayAuthToken.generateUserAuthorizationUrl('SANDBOX', scopes);
    await open(authUrl);

    // // Wait for the first auth code
    const code = await p;

    // console.log('code', code);

    const accessTokenResponse = await ebayAuthToken.exchangeCodeForAccessToken('SANDBOX', code);
    const accessTokenJson = JSON.parse(accessTokenResponse);

    await writeRefreshToken({
      refresh_token: accessTokenJson.refresh_token,
      expires: accessTokenJson.refresh_token_expires_in + Date.now(),
    });
    server.close();
    accessToken = accessTokenJson.access_token;
  }

  console.log('Logged in successfully with token ', JSON.stringify(accessToken, null, 2));
  return accessToken;
};

export const getOrders = async (api) => {
  const response = await api.get('/sell/fulfillment/v1/order?limit=10');
  console.log(response);
};

export const convertCardToInventory = (card) => ({
  availability: {
    pickupAtLocationAvailability: [
      {
        availabilityType: 'IN_STOCK',
        fulfillmentTime: {
          unit: 'BUSINESS_DAY',
          value: '1',
        },
        merchantLocationKey: 'default',
        quantity: card.quantity,
      },
    ],
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
      quantity: card.quantity,
    },
  },
  country: 'US',
  condition: isYes(card.graded) ? 'LIKE_NEW' : 'USED_VERY_GOOD', // could be "2750 :4000" instead?
  //'ConditionEnum : [NEW,LIKE_NEW,NEW_OTHER,NEW_WITH_DEFECTS,MANUFACTURER_REFURBISHED,CERTIFIED_REFURBISHED,EXCELLENT_REFURBISHED,VERY_GOOD_REFURBISHED,GOOD_REFURBISHED,SELLER_REFURBISHED,USED_EXCELLENT,USED_VERY_GOOD,USED_GOOD,USED_ACCEPTABLE,FOR_PARTS_OR_NOT_WORKING]',
  // conditionDescription: 'string',
  // need to support graded as well, this is only ungraded
  conditionDescriptors: [
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
      value: card.oz,
    },
  },
  product: {
    aspects: {
      'Country/Region of Manufacture': ['United States'],
      country: ['United States'],
    },
    // "aspects": {
    //   "Feature":[
    //     "Water resistance", "GPS"
    //   ],
    //   "CPU":[
    //     "Dual-Core Processor"
    //   ]
    // },
    country: 'United States',
    brand: card.manufacture,
    description: card.description,
    // ean: ['string'],
    // epid: 'string',
    imageUrls: card.pics.split('|'), //TODO: fix the input value to be an array
    // isbn: ['string'],
    // mpn: 'string',
    // subtitle: 'string',
    title: card.title,
    // upc: ['string'],
    // videoIds: ['string'],
  },
});

const createOfferForCard = (card) => ({
  availableQuantity: card.quantity,
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
    paymentPolicyId: '73080971024',
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
    returnPolicyId: '143996946024',
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
  merchantLocationKey: 'default',
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
      value: card.price,
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
  sku: card.key,
  storeCategoryNames: ['Sports Cards', card.sport],
  // tax: {
  //   applyTax: 'boolean',
  //   thirdPartyTaxCategory: 'string',
  //   vatPercentage: 'number',
  // },
});

export const ebayAPIUpload = async (allCards) => {
  // const eBay = eBayApi.fromEnv();
  //
  // eBay.OAuth2.setScope([
  //   'https://api.ebay.com/oauth/api_scope',
  //   'https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly',
  //   'https://api.ebay.com/oauth/api_scope/sell.fulfillment'
  // ]);
  const token = await loginEbayAPI();
  const api = axios.create({
    baseURL: 'https://api.sandbox.ebay.com',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Language': 'en-US',
    },
  });
  Object.values(allCards).forEach((card) => (card.key = `${card.key}-1`));
  // await getOrders(api);
  console.log('allCards', allCards);

  await Promise.all(
    Object.values(allCards).map((card) =>
      api
        .put('/sell/inventory/v1/inventory_item/' + card.key, convertCardToInventory(card))
        .then((response) =>
          api
            .post('/sell/inventory/v1/offer/', createOfferForCard(card))
            .then((response) => console.log('offer id', response.data))
            .catch((error) => {
              let offerId = null;
              error.response?.data?.errors?.forEach((error) => {
                const offerIdParam = error.parameters?.find((param) => param.name === 'offerId');
                if (offerIdParam) {
                  offerId = offerIdParam.value;
                }
              });
              console.log('offerId', offerId);
              if (offerId) {
                return offerId;
              } else {
                throw error;
              }
            })
            .then((offerId) =>
              api.post(`/sell/inventory/v1/offer/${offerId}/publish`).then((response) => {
                if (response.data.warnings) {
                  throw new Error(JSON.stringify(response.data.warnings, null, 2));
                } else {
                  console.log(`Successfully create ${chalk.magenta(response.data.lis)} ${chalk.green(card.title)}`);
                }
              }),
            ),
        )
        .catch((error) => {
          // console.error('ERROR', error);
          if (error.response) {
            console.error('ERROR', JSON.stringify(error.response.data, null, 2));
          } else {
            console.error('ERROR', error);
          }
          console.error('data', JSON.stringify(error.config.data, null, 2));
        }),
    ),
  );
};

export default writeEbayFile;
