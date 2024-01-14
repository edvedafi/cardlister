import dotenv from 'dotenv';
import 'zx/globals';
import minimist from 'minimist';
import { getMySlabSales } from './listing-sites/myslabs.js';

const args = minimist(process.argv.slice(2));

$.verbose = false;

dotenv.config();

await getMySlabSales();
