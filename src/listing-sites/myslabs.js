import chalk from 'chalk';
import { useSpinners } from '../utils/spinners.js';
import axios from 'axios';
import { updateFirebaseListing } from './firebase.js';

const color = chalk.hex('#275467');
const { showSpinner, finishSpinner, errorSpinner, updateSpinner, pauseSpinners, resumeSpinners, log } = useSpinners(
  'myslabs',
  color,
);

let _api;

export async function getMySlabSales() {
  showSpinner('sales', 'Getting sales from MySlabs');
  let sales = [];

  try {
    await login();
    const apiResults = await fetchSales();
    log('api', apiResults);
    sales = convertSalesToCards(apiResults);
    log('sales', sales);
    finishSpinner('sales', `Found ${sales.length} cards sold on MySlabs`);
    return sales;
  } catch (e) {
    errorSpinner('sales', 'Failed to get sales from MySlabs');
    throw e;
  }
}

export async function uploadToMySlabs(cards) {
  showSpinner('Uploading', 'Uploading to My Slabs');
  let count = 0;
  const api = await login();
  await Promise.all(
    Object.values(cards)
      .filter((card) => parseFloat(card.price) > 9.98)
      .map(async (card) => {
        try {
          showSpinner(`upload-${card.sku}`, card.title);
          updateSpinner(`upload-${card.sku}`, `${card.title} (Posting)`);
          const slabResponse = await api.post('/slabs', buildCard(card));
          if (slabResponse.status === 201) {
            updateSpinner(`upload-${card.sku}`, `${card.title} (Firebase)`);
            await updateFirebaseListing({ sku: card.sku, myslabs: slabResponse.data.id });
            finishSpinner(`upload-${card.sku}`, card.title);
          } else {
            errorSpinner(
              `upload-${card.sku}`,
              `${card.title} | ${slabResponse.status} ${slabResponse.statusText} ${slabResponse.data}`,
            );
          }
        } catch (e) {
          errorSpinner(`upload-${card.sku}`, `${card.title} | ${e.message} ${JSON.stringify(e.response.data)}`);
        }
      }),
  );
  finishSpinner('Uploading', `Uploaded ${count}`);
}

export function buildCard(card) {
  const slab = {
    title: card.title,
    price: card.price,
    description: card.longTitle,
    category: card.sport.toUpperCase(),
    year: card.year,
    for_sale: true,
    allow_offer: true,
    minimum_offer: 0,
    external_id: card.sku,
  };

  if (card.pics.length > 0) {
    slab.slab_image_1 = card.pics[0];
  }
  if (card.pics.length > 1) {
    slab.slab_image_2 = card.pics[1];
  }
  if (card.graded) {
    slab.publish_type = 'SLABBED_CARD';
    slab.card_type = card.grader;
    slab.grade = card.grade;
  } else {
    slab.publish_type = 'RAW_CARD_SINGLE';
    slab.condition = 'MYSLABS_B';
  }

  return slab;
}

export async function login() {
  showSpinner('login', 'Logging into MySlabs');
  if (!_api) {
    try {
      const response = await axios.post(
        'https://myslabs.com/api/v2/oauth2/token',
        {
          grant_type: 'client_credentials',
        },
        {
          headers: {
            Authorization: `Basic ${process.env.MYSLABS_BASE64}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      const { access_token } = response.data;
      _api = axios.create({
        baseURL: 'https://myslabs.com/api/v2',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
    } catch (e) {
      errorSpinner('login', 'Failed to login to MySlabs');
      throw e;
    }
  }
  finishSpinner('login');
  return _api;
}

export async function fetchSales() {
  showSpinner('fetchSales', 'Fetching sales from MySlabs');
  try {
    const api = await login();
    const response = await api.get('/my/slabs?status=sold&sort=completion_date_desc&page=1&page_count=10');
    const { data } = response;
    finishSpinner('fetchSales');
    return data;
  } catch (e) {
    errorSpinner('fetchSales', `Failed to fetch sales from MySlabs ${e.message}`);
    throw e;
  }
}

export function convertSalesToCards(sales) {
  showSpinner('convertSalesToCards', 'Converting sales to cards');
  const cards = [];
  sales.forEach((sale) => {
    showSpinner('convertCard', `Converting ${sale.title}`);
    if (new Date(sale.sold_date) < new Date(sale.updated_date)) {
      finishSpinner('convertCard');
    } else {
      cards.push({
        platform: 'MySlabs',
        title: sale.title,
        quantity: 1,
        sku: sale.external_id,
      });
      finishSpinner('convertCard', `Sold: ${sale.title}`);
    }
  });
  finishSpinner('convertSalesToCards');
  return cards;
}

export async function removeFromMySlabs(cards) {
  showSpinner('removeFromMySlabs', 'Removing from My Slabs');
  let count = 0;
  const api = await login();

  await Promise.all(
    cards
      .filter((card) => card.platform.indexOf('MySlabs') === -1)
      .map(async (card) => {
        try {
          showSpinner(`remove-${card.sku}`, card.title);
          if (card.myslabs) {
            updateSpinner(`remove-${card.sku}`, `${card.title} (Removing)`);
            const slabResponse = await api.delete(`/slabs/${card.myslabs}`);
            if (slabResponse.status === 204) {
              updateSpinner(`remove-${card.sku}`, `${card.title} (Firebase)`);
              await updateFirebaseListing({ sku: card.sku, myslabs: null });
              count++;
              finishSpinner(`remove-${card.sku}`, card.title);
            } else {
              errorSpinner(
                `remove-${card.sku}`,
                `${card.title} | ${slabResponse.status} ${slabResponse.statusText} ${slabResponse.data}`,
              );
            }
          } else {
            finishSpinner(`remove-${card.sku}`);
          }
        } catch (e) {
          errorSpinner(`remove-${card.sku}`, `${card.title} | ${e.message} ${JSON.stringify(e.response?.data)}`);
        }
      }),
  );

  finishSpinner('removeFromMySlabs', `Removed ${count} cards from My Slabs`);
}
