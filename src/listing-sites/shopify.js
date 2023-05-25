//write a function that takes in a file path and an array of objects that will be written as a csv to the file
import {createObjectCsvWriter} from 'csv-writer';
import {isNo, isYes, titleCase} from "../utils/data.js";

const defaultValues = {
  vendor: 'edvedafi',
  published: 'TRUE',
  category: '532',
  inventoryTracker: 'shopify',
  variantInventoryPolicy: 'deny',
  variantFulfillmentService: 'manual',
  requireShipping: 'TRUE',
  taxable: 'TRUE',
  imagePosition: '1',
  status: 'active',
  opt1: 'Title',
  opt1Value: 'Default Title',
  location: 'Home',
}

const filePath = 'output/shopify.csv';

async function writeShopifyFile(data) {
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      {id: 'handle', title: 'Handle'},
      {id: 'vendor', title: 'Vendor'},
      {id: 'published', title: 'Published'},
      {id: 'title', title: 'Title'},
      {id: 'description', title: 'Body (HTML)'},
      {id: 'weight', title: 'Variant Grams'},
      {id: 'inventoryTracker', title: 'Variant Inventory Tracker'},
      {id: 'quantity', title: 'Variant Inventory Qty'},
      {id: 'quantity', title: 'On Hand'},
      {id: 'price', title: 'Variant Price'},
      {id: 'variantInventoryPolicy', title: 'Variant Inventory Policy'},
      {id: 'variantFulfillmentService', title: 'Variant Fulfillment Service'},
      {id: 'requireShipping', title: 'Variant Requires Shipping'},
      {id: 'taxable', title: 'Variant Taxable'},
      {id: 'image', title: 'Image Src'},
      {id: 'imagePosition', title: 'Image Position'},
      {id: 'imageAlt', title: 'Image Alt Text'},
      {id: 'status', title: 'Status'},
      {id: 'tags', title: 'Tags'},
      {id: 'opt1', title: 'Option1 Name'},
      {id: 'opt1Value', title: 'Option1 Value'},
      {id: 'opt2', title: 'Option2 Name'},
      {id: 'opt2Value', title: 'Option2 Value'},
      {id: 'opt3', title: 'Option3 Name'},
      {id: 'opt3Value', title: 'Option3 Value'},
      {id: 'location', title: 'Location'}
    ],
  });

  //shopify mapping logic
  let csvData = Object.values(data).filter(card => card.cardNumber).map((card) => {
    const addTag = (tag) => {
      if (card.tags && card.tags.length > 0) {
        card.tags = `${card.tags}, ${tag}`;
      } else {
        card.tags = tag;
      }
    }

    card.handle = `${card.directory.replaceAll('/', '-')}${card.cardNumber}-${card.player.replaceAll(' ', '-')}`

    if (isYes(card.autographed)) {
      addTag('Autographed');
    }

    if (parseInt(card.year) < 1987) {
      addTag('Vintage');
    } else if (parseInt(card.year) > 2000) {
      addTag('Modern');
    }

    if (card.thickness.indexOf('pt') < 0) {
      card.thickness = `${card.thickness}pt`
    }
    addTag(card.thickness);

    if (isYes(card.parallel)) {
      addTag('Parallel');
    } else if (card.parallel && card.parallel.length > 0) {
      addTag('Parallel');
      addTag(titleCase(card.parallel));
    }

    if (isYes(card.insert)) {
      addTag('Insert');
    } else if (card.insert && card.insert.length > 0) {
      addTag('Insert');
      addTag(titleCase(card.insert));
    }

    if (card.printRun && card.printRun > 0) {
      addTag('Serial Numbered');
    }

    if (card.features && !isNo(card.features) && card.features.length > 0) {
      card.features.split('|').forEach(addTag);
    }

    if (card.league && card.league.length > 0) {
      addTag(card.league.toUpperCase());
    }

    if (card.sport) {
      card.sport = titleCase(card.sport);
      addTag(card.sport);
      card.type = `${card.sport} Card`;
    } else {
      card.sport = 'N/A';
    }

    addTag(card.year);
    addTag(card.setName);
    addTag(card.player);
    addTag(card.team);
    if (card.grade) {
      addTag(card.grade);
    }

    card.weight = card.lbs * 453.59237 + card.oz * 28.3495231;

    card.description = `${card.longTitle}`

    card.setName = `${card.year} ${card.setName}`;

    return card;
  });

  // merge defaults
  csvData = csvData.map((card) => ({...defaultValues, ...card}));

  // make a second record for each image
  const secondImages = [];
  csvData = csvData.map((card) => {
    console.log(card.pics);
    const images = card.pics.split('|');
    images.forEach((image, index) => {
      if (index === 0) {
        card.image = image;
        card.imagePosition = 1;
        card.imageAlt = `Front of ${card.year}  ${card.setName} #${card.cardNumber} ${card.player}`;
      } else {
        secondImages.push({
          handle: card.handle,
          image,
          imagePosition: index + 1,
          imageAlt: `Back of ${card.year}  ${card.setName} #${card.cardNumber} ${card.player}`,
        });
      }
    });
    return card;
  });

  console.log(secondImages)
  csvData = csvData.concat(secondImages);
  console.log(`Writing ${csvData.length} records to ${filePath}`);

  try {
    await csvWriter.writeRecords(csvData);
  } catch (e) {
    console.log('Failed to write shopify file: ', filePath);
    console.log(e);
    throw e;
  }
}

export default writeShopifyFile;

