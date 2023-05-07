//write a function that takes in a file path and an array of objects that will be written as a csv to the file
import {createObjectCsvWriter} from 'csv-writer';
import {isNo, isYes} from "../utils/data.mjs";

const defaultValues = {
  action: 'Add',
  category: '261328',
  storeCategory: '10796387017',
  condition: '3000',
  graded: 'No',
  grade: 'Not Graded',
  grader: 'Not Graded',
  parallel: 'Base',
  features: 'Base',
  team: 'N/A',
  autographed: 'No',
  certNumber: 'Not Graded',
  cardType: 'Sports Trading Card',
  autoAuth: 'N/A',
  country: 'United States',
  original: 'Original',
  language: 'English',
  shippingInfo: 'All shipping is with quality (though often used) top loaders, securely packaged and protected in an envelope if you choose the low cost Ebay Standard Envelope option. If you would like true tracking and a bubble mailer for further protection please choose the First Class Mail option. Please know your card will be packaged equally securely in both options!',
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
}

const filePath = 'output/ebay.csv';

async function writeEbayFile(data) {
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      {id: 'action', title: '*Action(SiteID=US|Country=US|Currency=USD|Version=1193|CC=UTF-8)'},
      {id: 'customLabel', title: 'CustomLabel'},
      {id: 'category', title: '*Category'},
      {id: 'storeCategory', title: 'StoreCategory'},
      {id: 'title', title: '*Title'},
      {id: 'condition', title: '*ConditionID'},
      {id: 'graded', title: '*C:Graded'},
      {id: 'sport', title: '*C:Sport'},
      {id: 'player', title: '*C:Player/Athlete'},
      {id: 'parallel', title: '*C:Parallel/Variety'},
      {id: 'manufacture', title: '*C:Manufacturer'},
      {id: 'year', title: 'C:Season'},
      {id: 'features', title: '*C:Features'},
      {id: 'setName', title: '*C:Set'},
      {id: 'grade', title: '*C:Grade'},
      {id: 'grader', title: '*C:Professional Grader'},
      {id: 'team', title: '*C:Team'},
      {id: 'league', title: '*C:League'},
      {id: 'autographed', title: '*C:Autographed'},
      {id: 'condition', title: '*C:Card Condition'},
      {id: 'cardName', title: '*C:Card Name'},
      {id: 'cardNumber', title: '*C:Card Number'},
      {id: 'certNumber', title: '*C:Certification Number'},
      {id: 'cardType', title: '*C:Type'},
      {id: 'signedBy', title: 'C:Signed By'},
      {id: 'autoAuth', title: 'C:Autograph Authentication'},
      {id: 'year', title: 'C:Year Manufactured'},
      {id: 'size', title: 'C:Card Size'},
      {id: 'country', title: 'C:Country/Region of Manufacture'},
      {id: 'material', title: 'C:Material'},
      {id: 'autoFormat', title: 'C:Autograph Format'},
      {id: 'vintage', title: 'C:Vintage'},
      {id: 'original', title: 'C:Original/Licensed Reprint'},
      {id: 'language', title: 'C:Language'},
      {id: 'thickness', title: 'C:Card Thickness'},
      {id: 'insert', title: 'C:Insert Set'},
      {id: 'printRun', title: 'C:Print Run'},
      {id: 'pics', title: 'PicURL'},
      {id: 'description', title: '*Description'},
      {id: 'format', title: '*Format'},
      {id: 'duration', title: '*Duration'},
      {id: 'price', title: '*StartPrice'},
      {id: 'autoOffer', title: 'BestOfferAutoAcceptPrice'},
      {id: 'minOffer', title: 'MinimumBestOfferPrice'},
      {id: 'returns', title: '*ReturnsAcceptedOption'},
      {id: 'returnPolicy', title: 'ReturnProfileName'},
      {id: 'acceptOffers', title: 'BestOfferEnabled'},
      {id: 'shippingPolicy', title: 'ShippingProfileName'},
      {id: 'shippingFrom', title: '*Location'},
      {id: 'shippingZip', title: 'PostalCode'},
      {id: 'shippingTime', title: '*DispatchTimeMax'},
      {id: 'weightUnit', title: 'WeightUnit'},
      {id: 'lbs', title: 'WeightMajor'},
      {id: 'oz', title: 'WeightMinor'},
      {id: 'length', title: 'PackageLength'},
      {id: 'width', title: 'PackageWidth'},
      {id: 'depth', title: 'PackageDepth'},
      {id: 'packageType', title: 'PackageType'},
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
    }

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

    if (parseInt(card.year) < 1987) {
      card.vintage = 'Yes';
    } else {
      card.vintage = 'No';
    }

    if (card.thickness.indexOf('pt') < 0) {
      card.thickness = `${card.thickness}pt`
    }

    if (!card.parallel || isNo(card.parallel)) {
      card.parallel = 'Base Set';
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

    card.league = card.league ? {
      'mlb': 'Major League (MLB)',
      'nfl': 'National Football League (NFL)',
      'nba': 'National Basketball Association (NBA)',
      'nhl': 'National Hockey League (NHL)'
    }[card.league?.toLowerCase()] || card.league : 'N/A';

    card.description = `${card.longTitle}<br><br>${defaultValues.shippingInfo}`

    card.setName = `${card.year} ${card.setName}`;

    return card;
  });

  // merge defaults
  csvData = csvData.map((card) => ({...defaultValues, ...card}));

  try {
    await csvWriter.writeRecords(csvData);
  } catch (e) {
    console.log('Failed to write ebay file: ', filePath);
    console.log(e);
    throw e;
  }
}

export default writeEbayFile;

