import dotenv from 'dotenv';
import 'zx/globals';
import minimist from 'minimist';
import { login as sportlotsLogin, shutdownSportLots } from './listing-sites/sportlots.js';
import getSetData from './card-data/setData.js';
import { login as bscLogin, shutdownBuySportsCards } from './listing-sites/bsc.js';
import { useSpinners } from './utils/spinners.js';
import initializeFirebase from './utils/firebase.js';

const args = minimist(process.argv.slice(2));

$.verbose = false;

dotenv.config();

const color = chalk.cyan;
const { showSpinner, log } = useSpinners('testselect', color);
const { update, finish, error } = showSpinner('testselect', 'Getting set data');

try {
  update('logging in');
  await Promise.all([bscLogin(), sportlotsLogin(), initializeFirebase()]);
  update('Bin test');
  const byBin = await getSetData({ bin: '96' });
  log('byBin', byBin);

  update('Info test');
  const setInfo = await getSetData({ sport: 'football', year: '2023', manufacture: 'Bowman' });
  log('byinfo', setInfo);
  finish();
} catch (e) {
  error(e);
} finally {
  await shutdownSportLots();
  await shutdownBuySportsCards();
}
