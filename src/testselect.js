import dotenv from 'dotenv';
import 'zx/globals';
import minimist from 'minimist';
import { getSalesFromMyCardPost, shutdownMyCardPost } from './listing-sites/mycardpost.js';

const args = minimist(process.argv.slice(2));

$.verbose = false;

dotenv.config();

try {
  await getSalesFromMyCardPost();
} finally {
  await shutdownMyCardPost();
}
