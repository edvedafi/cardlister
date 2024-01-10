import chalk from 'chalk';
import { useSpinners } from '../utils/spinners.js';
import axios from 'axios';
import { manufactures, sets } from '../utils/data.js';

const color = chalk.hex('#275467');
const { showSpinner, finishSpinner, errorSpinner, updateSpinner, pauseSpinners, resumeSpinners, log } = useSpinners(
  'myslabs',
  color,
);

let _api;

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

export function convertSalesToCards(sales) {
  showSpinner('convertSalesToCards', 'Converting sales to cards');
  const cards = [];
  sales.forEach((sale) => {
    showSpinner('convertCard', `Converting ${sale.title}`);
    if (new Date(sale.sold_date) < new Date(sale.updated_date)) {
      finishSpinner('convertCard');
    } else {
      const card = {
        platform: 'MySlabs',
        title: sale.title,
        quantity: 1,
      };
      if (sale.external_id) {
        cards.push({ ...card, sku: sale.external_id });
      } else {
        cards.push({
          ...card,
          ...reverseTitle(sale.title),
        });
      }
      finishSpinner('convertCard', `Sold: ${sale.title}`);
    }
  });
  finishSpinner('convertSalesToCards');
  return cards;
}

export async function getMySlabSales() {
  showSpinner('sales', 'Getting sales from MySlabs');
  let sales = [];

  try {
    await login();
    const apiResults = await fetchSales();
    sales = convertSalesToCards(apiResults);
    finishSpinner('sales', `Found ${sales.length} cards sold on MySlabs`);
    return sales;
  } catch (e) {
    errorSpinner('sales', 'Failed to get sales from MySlabs');
    throw e;
  }
}
