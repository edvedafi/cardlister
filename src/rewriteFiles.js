import { initializeAnswers } from './card-data/cardData.js';
import 'zx/globals';
import dotenv from 'dotenv';
import { getInputs } from './utils/inputs.js';
import writeFiles from './writeFiles.js';
import minimist from 'minimist';

const args = minimist(process.argv.slice(2));

dotenv.config();

const inputDirectory = await getInputs();
const savedAnswers = await initializeAnswers(inputDirectory, true);

await writeFiles(savedAnswers.allCardData, savedAnswers.bulk, args.r);
