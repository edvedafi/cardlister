//write a function that takes in a file path and an array of objects that will be written as a csv to the file
import { createObjectCsvWriter } from 'csv-writer';
import { isNo, isYes, manufactures, sets } from '../utils/data.js';
import { gradeIds, graderIds } from './ebayConstants.js';
import open from 'open';
import eBayApi from 'ebay-api';
import { Browser, Builder, By } from 'selenium-webdriver';
import { ask } from '../utils/ask.js';
import chalk from 'chalk';
import { useWaitForElement } from './uploads.js';
import express from 'express';
import fs from 'fs-extra';
import { useSpinners } from '../utils/spinners.js';

const color = chalk.hex('#84AF29');
const { showSpinner, finishSpinner, errorSpinner, updateSpinner, log } = useSpinners('ebay', color);

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
      // { id: 'autoOffer', title: 'BestOfferAutoAcceptPrice' },
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
  if (!token) {
    const app = express();

    let resolve;
    const authCode = new Promise((_resolve) => {
      resolve = _resolve;
    });
    app.get('/oauth', function (req, res) {
      resolve(req.query.code);
      res.end('');
    });
    const server = app.listen(3000);

    // console.log(eBay.OAuth2.generateAuthUrl());
    await open(eBay.OAuth2.generateAuthUrl());
    const code = await authCode;
    // console.log('code', code);

    try {
      token = await eBay.OAuth2.getToken(code);
      await writeRefreshToken(token);
    } catch (e) {
      console.error(e);
      throw e;
    } finally {
      server.close();
    }
  }

  eBay.OAuth2.setCredentials(token);

  // console.log('Logged in successfully!');
  return eBay;
};

export const getFeatures = (card) => {
  let features = card.features.split('|');
  if ((features.length === 1 && isNo(features[0])) || features[0] === '') {
    features = [];
  }

  if (card.parallel && !isNo(card.parallel)) {
    features.push('Parallel/Variety');
    if (card.parallel.toLowerCase().indexOf('refractor') > -1) {
      features.push('Refractor');
    }
  }

  if (card.insert && !isNo(card.insert)) {
    features.push('Insert');
  }

  if (card.printRun && card.printRun > 0) {
    features.push('Serial Numbered');
  }

  if (card.features.indexOf('RC') > -1) {
    features.push('Rookie');
  }

  if (card.features.length === 0) {
    features.push('Base Set');
  }

  // console.log('features', features);
  return features;
};

const booleanText = (val) => [isYes(val) ? 'Yes' : 'No'];
const displayOrNA = (testValue, displayValue) => {
  if (Array.isArray(displayValue) && displayValue.length > 0) {
    return displayValue;
  } else {
    return [testValue && !isNo(testValue) ? displayValue || testValue : 'N/A'];
  }
};
export const convertCardToInventory = (card) => ({
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
      quantity: card.quantity,
    },
  },
  country: 'US',
  condition: isYes(card.graded) ? 'LIKE_NEW' : 'USED_VERY_GOOD', // could be "2750 :4000" instead?
  //'ConditionEnum : [NEW,LIKE_NEW,NEW_OTHER,NEW_WITH_DEFECTS,MANUFACTURER_REFURBISHED,CERTIFIED_REFURBISHED,EXCELLENT_REFURBISHED,VERY_GOOD_REFURBISHED,GOOD_REFURBISHED,SELLER_REFURBISHED,USED_EXCELLENT,USED_VERY_GOOD,USED_GOOD,USED_ACCEPTABLE,FOR_PARTS_OR_NOT_WORKING]',
  // conditionDescription: 'string',
  // need to support graded as well, this is only ungraded
  conditionDescriptors: isYes(card.graded)
    ? [
        {
          name: '27501',
          values: [graderIds[card.grader] || 2750123],
        },
        {
          name: '27502',
          values: [gradeIds[card.grade]],
        },
        {
          name: '27503',
          values: [card.certNumber],
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
      value: card.oz,
    },
  },
  product: {
    aspects: {
      'Country/Region of Manufacture': ['United States'],
      country: ['United States'],
      type: ['Sports Trading Card'],
      sport: displayOrNA(card.sport, card.sport?.slice(0, 1).toUpperCase() + card.sport?.slice(1).toLowerCase()),
      Franchise: displayOrNA(
        card.team?.length > 0,
        card.team?.map((team) => team.display),
      ),
      team: displayOrNA(
        card.team?.length > 0,
        card.team?.map((team) => team.display),
      ),
      league: displayOrNA(
        {
          mlb: 'Major League (MLB)',
          nfl: 'National Football League (NFL)',
          nba: 'National Basketball Association (NBA)',
          nhl: 'National Hockey League (NHL)',
        }[card.league?.toLowerCase()] || card.league,
      ),
      Set: [`${card.year} ${card.setName}`],
      Manufacturer: [card.manufacture],
      'Year Manufactured': [card.year.indexOf('-') > -1 ? card.year.split('-')[0] : card.year],
      Season: [card.year.indexOf('-') > -1 ? card.year.split('-')[0] : card.year],
      Character: [card.player],
      'Player/Athlete': [card.player],
      'Autograph Authentication': displayOrNA(card.autographed, card.manufacture),
      Grade: displayOrNA(card.grade),
      Graded: booleanText(card.graded),
      'Autograph Format': displayOrNA(card.autoFormat),
      'Professional Grader': displayOrNA(card.grader),
      'Certification Number': displayOrNA(card.certNumber),
      'Autograph Authentication Number': displayOrNA(card.certNumber),
      Features: getFeatures(card),
      'Parallel/Variety': [card.parallel || (card.insert && !isNo(card.insert) ? 'Base Insert' : 'Base Set')],
      Autographed: booleanText(card.autographed),
      'Card Name': [card.cardName],
      'Card Number': [card.cardNumber],
      'Signed By': displayOrNA(card.autographed, card.player),
      Material: [card.material],
      'Card Size': [card.size],
      'Card Thickness': [card.thickness.indexOf('pt') < 0 ? `${card.thickness} Pt.` : card.thickness],
      Language: [card.language || 'English'],
      'Original/Licensed Reprint': [card.original || 'Original'],
      Vintage: booleanText(parseInt(card.year) < 1986),
      'Card Condition': [card.condition || 'Excellent'],
      'Convention/Event': displayOrNA(card.convention),
      'Insert Set': [card.insert || 'Base Set'],
      'Print Run': displayOrNA(card.printRun),
    },
    country: 'United States',
    brand: card.manufacture,
    description: card.description || `${card.longTitle}<br><br>${defaultValues.shippingInfo}`,
    // ean: ['string'],
    // epid: 'string',
    imageUrls: card.pics.split('|'), //TODO: fix the input value to be an array
    // isbn: ['string'],
    mpn: card.setName,
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
  sku: card.sku,
  storeCategoryNames: [card.sport],
  // tax: {
  //   applyTax: 'boolean',
  //   thirdPartyTaxCategory: 'string',
  //   vatPercentage: 'number',
  // },
});

let cachedLocation;
export const getLocation = async (eBay) => {
  showSpinner('location', 'Getting Location');
  if (cachedLocation) {
    finishSpinner('location');
    return cachedLocation;
  } else {
    let location;
    try {
      location = await eBay.sell.inventory.getInventoryLocation('CardLister');
    } catch (e) {
      showSpinner('location', 'No Location Found, Creating');
      if (e.meta?.errorId === 25804) {
        location = await eBay.sell.inventory.createInventoryLocation('CardLister', {
          location: {
            address: {
              addressLine1: '3458 Edinburgh Rd',
              // addressLine2: 'string',
              city: 'Green Bay',
              country: 'US',
              // 'CountryCodeEnum : [AD,AE,AF,AG,AI,AL,AM,AN,AO,AQ,AR,AS,AT,AU,AW,AX,AZ,BA,BB,BD,BE,BF,BG,BH,BI,BJ,BL,BM,BN,BO,BQ,BR,BS,BT,BV,BW,BY,BZ,CA,CC,CD,CF,CG,CH,CI,CK,CL,CM,CN,CO,CR,CU,CV,CW,CX,CY,CZ,DE,DJ,DK,DM,DO,DZ,EC,EE,EG,EH,ER,ES,ET,FI,FJ,FK,FM,FO,FR,GA,GB,GD,GE,GF,GG,GH,GI,GL,GM,GN,GP,GQ,GR,GS,GT,GU,GW,GY,HK,HM,HN,HR,HT,HU,ID,IE,IL,IM,IN,IO,IQ,IR,IS,IT,JE,JM,JO,JP,KE,KG,KH,KI,KM,KN,KP,KR,KW,KY,KZ,LA,LB,LC,LI,LK,LR,LS,LT,LU,LV,LY,MA,MC,MD,ME,MF,MG,MH,MK,ML,MM,MN,MO,MP,MQ,MR,MS,MT,MU,MV,MW,MX,MY,MZ,NA,NC,NE,NF,NG,NI,NL,NO,NP,NR,NU,NZ,OM,PA,PE,PF,PG,PH,PK,PL,PM,PN,PR,PS,PT,PW,PY,QA,RE,RO,RS,RU,RW,SA,SB,SC,SD,SE,SG,SH,SI,SJ,SK,SL,SM,SN,SO,SR,ST,SV,SX,SY,SZ,TC,TD,TF,TG,TH,TJ,TK,TL,TM,TN,TO,TR,TT,TV,TW,TZ,UA,UG,UM,US,UY,UZ,VA,VC,VE,VG,VI,VN,VU,WF,WS,YE,YT,ZA,ZM,ZW]',
              // county: 'string',
              postalCode: '54311',
              stateOrProvince: 'WI',
            },
            // geoCoordinates: {
            //   latitude: 'number',
            //   longitude: 'number',
            // },
          },
          // locationAdditionalInformation: 'string',
          // locationInstructions: 'string',
          // locationTypes: ['StoreTypeEnum'],
          locationWebUrl: 'www.edvedafi.com',
          merchantLocationStatus: 'ENABLED', //'StatusEnum : [DISABLED,ENABLED]',
          name: 'CardLister',
          // operatingHours: [
          //   {
          //     dayOfWeekEnum: 'DayOfWeekEnum : [MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY,SUNDAY]',
          //     intervals: [
          //       {
          //         close: 'string',
          //         open: 'string',
          //       },
          //     ],
          //   },
          // ],
          // phone: 'string',
          // specialHours: [
          //   {
          //     date: 'string',
          //     intervals: [
          //       {
          //         close: 'string',
          //         open: 'string',
          //       },
          //     ],
          //   },
          // ],
        });
      }
      showSpinner('location', 'Created new location');
      location = await eBay.sell.inventory.getInventoryLocation('CardLister');
    }
    cachedLocation = location;
    finishSpinner('location');
    return location;
  }
};

export const ebayAPIUpload = async (allCards) => {
  showSpinner('sales', 'Uploading Cards');
  const eBay = await loginEbayAPI();
  updateSpinner('sales', `Uploading: ${Object.values(allCards).map((card) => card.sku)}`);
  let count = 0;

  //don't need to do anything with location but do need to ensure it exists
  await getLocation(eBay);

  await Promise.all(
    Object.values(allCards)
      // .filter((c) => c.sku !== '5|FS-1')
      .map(async (card) => {
        try {
          showSpinner(card.sku, `Uploading ${card.title} (Inventory)`);
          await eBay.sell.inventory.createOrReplaceInventoryItem(card.sku, convertCardToInventory(card));
          let offerId;
          const offer = createOfferForCard(card);
          try {
            updateSpinner(card.sku, `Uploading ${card.title} (Offer)`);
            const response = await eBay.sell.inventory.createOffer(offer);
            offerId = response.offerId;
          } catch (e) {
            const error = e.meta?.res?.data.errors[0];
            if (error?.errorId === 25002) {
              offerId = error.parameters[0].value;
              updateSpinner(card.sku, `Uploading ${card.title} (Updating Offer)`);
              await eBay.sell.inventory.updateOffer(offerId, offer);
            }
          }
          updateSpinner(card.sku, `Uploading ${card.title} (Publish)`);
          await eBay.sell.inventory.publishOffer(offerId);
          finishSpinner(card.sku, `Uploaded ${card.title}`);
          count++;
        } catch (e) {
          if (e.meta?.res?.data) {
            log('InventoryItem error info', e.meta?.res?.data);
          }
          errorSpinner(card.sku, `Failed Uploading ${card.title} (${e.message})`);
        }
      }),
  );
  finishSpinner('sales', `Uploaded ${chalk.green(count)} cards to ebay`);
};

export const reverseTitle = (title) => {
  const cardNumberIndex = title.indexOf('#');
  const yearIdx = title.match(/\D*-?\D+/)?.index;
  let setInfo = title.slice(yearIdx, cardNumberIndex).trim();
  const card = {
    cardNumber: title.match(/#(.*\d+)/)?.[1].replaceAll(' ', ''),
    year: title.split(' ')[0],
    parallel: '',
    insert: '',
    // setName: setName.join('|'),
    // manufacture: 'Panini',
    setName: setInfo,
    // sport: 'Football',
  };

  const manufacture = manufactures.find((m) => setInfo.toLowerCase().indexOf(m) > -1);
  if (manufacture) {
    if (manufacture === 'score') {
      card.manufacture = 'Panini';
    } else {
      card.manufacture = setInfo.slice(setInfo.toLowerCase().indexOf(manufacture), manufacture.length);
      setInfo = setInfo.replace(card.manufacture, '').trim();
      card.setName = setInfo;
    }
  }

  const set = sets.find((s) => setInfo.toLowerCase().indexOf(s) > -1);
  if (set) {
    card.setName = setInfo.slice(setInfo.toLowerCase().indexOf(set), set.length);
    setInfo = setInfo.replace(card.setName, '').trim();
    if (!card.manufacture) {
      const paniniSearch = `panini ${card.setName.toLowerCase()}`;
      if (sets.find((s) => s === paniniSearch)) {
        card.manufacture = 'Panini';
      } else {
        const toppsSearch = `topps ${card.setName.toLowerCase()}`;
        if (sets.find((s) => s === toppsSearch)) {
          card.manufacture = 'Topps';
        }
      }
    }
  }

  const insertIndex = setInfo.toLowerCase().indexOf('insert');
  if (insertIndex > -1) {
    card.insert = setInfo.slice(0, insertIndex).trim();
    setInfo = setInfo.replace(card.insert, '').trim();
    setInfo = setInfo.replace('Insert', '').trim();
  }

  const parallelIndex = setInfo.toLowerCase().indexOf('parallel');
  if (parallelIndex > -1) {
    card.parallel = setInfo.slice(0, parallelIndex).trim();
    setInfo = setInfo.replace(card.parallel, '').trim();
    setInfo = setInfo.replace('Parallel', '').trim();
  }

  if (setInfo.length > 0) {
    if (!card.insert) {
      card.insert = setInfo;
    } else if (!card.parallel) {
      card.parallel = setInfo;
    } else {
      console.log('No Field left to put the remaining SetInfo', setInfo, 'for', card);
    }
  }

  // console.log('card', card);

  return card;
};

export const getEbaySales = async () => {
  showSpinner('sales', 'Checking eBay for Sales');
  const eBay = await loginEbayAPI();

  //don't need to do anything with location but do need to ensure it exists
  await getLocation(eBay);
  const response = await eBay.sell.fulfillment.getOrders({
    filter: 'orderfulfillmentstatus:{NOT_STARTED|IN_PROGRESS}',
  });
  // console.log(response);
  const cards = [];
  response.orders.forEach((order) => {
    if (order.orderFulfillmentStatus === 'FULFILLED') {
      // console.log(`Order already fulfilled for ${order.buyer.username}`);
    } else {
      order.lineItems.forEach((lineItem) => {
        showSpinner(lineItem.sku, `Getting details for ${lineItem.title}`);
        const card = {
          platform: `ebay: ${order.buyer.username}`,
          ...reverseTitle(lineItem.title),
          title: lineItem.title,
          quantity: lineItem.quantity,
        };
        if (lineItem.sku) {
          card.sku = lineItem.sku;
        }
        if (card.cardNumber) {
          finishSpinner(lineItem.sku, `Sold ${card.title} x${card.quantity}`);
          cards.push(card);
        } else {
          errorSpinner(lineItem.sku, `Failed to parse ${card.title}`);
        }
      });
    }
  });
  finishSpinner('sales', `Found ${chalk.green(cards.length)} cards sold on ebay`);
  return cards;
};

export const removeFromEbayItemNumber = async (itemNumber, quantity, title) => {
  showSpinner(`ebay-card-${itemNumber}-details`, `${itemNumber}: Login to eBay`);
  const ebay = await loginEbayAPI();
  updateSpinner(`ebay-card-${itemNumber}-details`, `${itemNumber}: Getting Item Details`);
  const item = await ebay.trading.GetItem({ ItemID: itemNumber });
  const updatedQuantity = parseInt(item.Item.Quantity) - parseInt(quantity);
  const result = { title, quantity, updatedQuantity, removed: false };
  if (updatedQuantity <= 0) {
    try {
      updateSpinner(`ebay-card-${itemNumber}-details`, `${itemNumber}: Ending the Item`);
      await ebay.trading.EndFixedPriceItem({ ItemID: itemNumber, EndingReason: 'NotAvailable' });
      result.removed = true;
    } catch (e) {
      if (e.meta?.Errors?.ErrorCode === 1047) {
        updateSpinner(`ebay-card-${itemNumber}-details`, `${itemNumber}: Was already ended on Ebay`);
        result.removed = true;
      } else {
        result.removed = false;
        updateSpinner(
          `ebay-card-${itemNumber}-details`,
          `${itemNumber}: Failed to remove ${e.meta?.Errors?.ErrorCode || e.message}`,
        );
        result.error = e.meta?.Errors?.ErrorCode || e.message;
      }
    }
  } else {
    try {
      updateSpinner(`ebay-card-${itemNumber}-details`, `${itemNumber}: Setting quantity to ${updatedQuantity}`);
      await ebay.trading.ReviseInventoryStatus({
        InventoryStatus: {
          ItemID: itemNumber,
          Quantity: updatedQuantity,
        },
      });
      updateSpinner(
        `ebay-card-${itemNumber}-details`,
        `${itemNumber}: Successfully set quantity to ${updatedQuantity}`,
      );
      result.removed = true;
    } catch (e) {
      updateSpinner(
        `ebay-card-${itemNumber}-details`,
        `${itemNumber}: Failed to quantity to ${updatedQuantity}. ${e.meta?.Errors?.ErrorCode || e.message}`,
      );
      result.error = e.meta.Errors.ErrorCode;
    }
  }
  finishSpinner(`ebay-card-${itemNumber}-details`);
  return result;
};

export const removeFromEbayBySKU = async (sku, quantity, title) => {
  showSpinner(`ebay-card-${sku}-details`, `${sku}: Login to eBay`);
  const ebay = await loginEbayAPI();
  const result = { title, quantity, removed: false };
  try {
    updateSpinner(`ebay-card-${sku}-details`, `${sku}: Fetch all offers`);
    const offers = await ebay.sell.inventory.getOffers({ sku });
    const item = offers.offers[0];
    const updatedQuantity = parseInt(item.availableQuantity) - parseInt(quantity);
    result.updatedQuantity = updatedQuantity;
    if (updatedQuantity <= 0) {
      try {
        updateSpinner(`ebay-card-${sku}-details`, `${sku}: No more inventory; end item`);
        await ebay.sell.inventory.deleteOffer(item.offerId);
        updateSpinner(`ebay-card-${sku}-details`, `${sku}: Successfully Ended Item`);
        result.removed = true;
      } catch (e) {
        if (e.meta.Errors.ErrorCode === 1047) {
          updateSpinner(`ebay-card-${sku}-details`, `${sku}: Item was already ended`);
          result.removed = true;
        } else {
          result.removed = false;
          result.error = e.meta?.Errors?.ErrorCode || e.message;
          updateSpinner(
            `ebay-card-${sku}-details`,
            `${sku}: Failed to remove: ${e.meta?.Errors?.ErrorCode || e.message}`,
          );
        }
      }
    } else {
      try {
        updateSpinner(`ebay-card-${sku}-details`, `${sku}: Setting remaining quantity to ${updatedQuantity}`);
        await ebay.sell.inventory.updateOffer(item.offerId, { ...item, availableQuantity: updatedQuantity });
        updateSpinner(`ebay-card-${sku}-details`, `${sku}: Successfully set remaining quantity to ${updatedQuantity}`);
        result.removed = true;
      } catch (e) {
        updateSpinner(
          `ebay-card-${sku}-details`,
          `${sku}: Failed to reduce quantity ${e?.meta?.Errors?.ErrorCode || e?.message}`,
        );
        console.error(chalk.red(`Failed to reduce quantity of ${title} on ebay`));
        result.error = e?.meta?.Errors?.ErrorCode || e?.message;
      }
    }
  } catch (e) {
    updateSpinner(`ebay-card-${sku}-details`, `${sku}: Failed to update ${e?.meta?.Errors?.ErrorCode || e?.message}`);
    result.error = e?.meta?.Errors?.ErrorCode || e?.message;
  }
  finishSpinner(`ebay-card-${sku}-details`);
  return result;
};

export const removeFromEbay = async (cards = [], db) => {
  showSpinner('ebay', 'Removing Cards from eBay');
  showSpinner('ebay-details', 'Removing Cards from eBay');
  let toRemove = cards.filter((card) => !card.platform?.startsWith('ebay'));
  updateSpinner('ebay', `Removing ${chalk.green(toRemove.length)} cards from eBay`);
  const notRemoved = [];
  const removed = [];

  if (toRemove.length > 0) {
    updateSpinner('ebay-details', 'Sorting Cards by SKU');
    const removals = [];
    for (const card of toRemove) {
      showSpinner(`ebay-card-${card.title}`, `${card.title}: Checking for Item Number or SKU`);
      if (card.ItemID) {
        updateSpinner(`ebay-card-${card.title}`, `${card.title}: Removing by Item Number`);
        removals.push(await removeFromEbayItemNumber(card.ItemID, card.quantity, card.title));
      } else if (card.sku) {
        updateSpinner(`ebay-card-${card.title}`, `${card.title}: Removing by SKU`);
        removals.push(await removeFromEbayBySKU(card.sku, card.quantity, card.title));
      } else {
        notRemoved.push({ ...card, remaining: '?', error: 'No Item Number or SKU' });
        errorSpinner(
          `ebay-card-${card.title}`,
          `${card.title}: No Item Number or SKU ${card.quantity > 1 ? `(x${card.quantity})` : ''}`,
        );
      }
    }

    updateSpinner('ebay-details', 'Running Removals');
    const results = await Promise.all(removals);
    results.forEach((result) => {
      if (result.removed) {
        removed.push(result);
        finishSpinner(`ebay-card-${result.title}`, `${result.title}`);
      } else {
        notRemoved.push(result);
        errorSpinner(
          `ebay-card-${result.title}`,
          `${result.title}: Failed to remove. ${result.error} ${result.quantity > 1 ? `(x${result.quantity})` : ''}`,
        );
      }
    });

    finishSpinner('ebay-details');
    if (removed.length === toRemove.length && toRemove.length === 0) {
      finishSpinner('ebay', `Removed all ${chalk.green(removed.length)} cards from ebay`);
    } else {
      finishSpinner('ebay', `Removed ${chalk.red(removed.length)} of ${chalk.red(toRemove.length)} cards from ebay`);
    }
  } else {
    finishSpinner('ebay-details');
    finishSpinner('ebay', 'No cards to remove from ebay');
  }
};

export default writeEbayFile;
