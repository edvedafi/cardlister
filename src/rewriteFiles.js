import {getInputDirectory} from "./utils/ask.js";
import {initializeAnswers} from "./card-data/cardData.js";
import 'zx/globals';
import dotenv from 'dotenv'
import writeOutputFiles from "./writeFiles.js";

dotenv.config();

const inputDirectory = await getInputDirectory();
const savedAnswers = await initializeAnswers(inputDirectory, true);
await writeOutputFiles(savedAnswers.allCardData)
Object.values(savedAnswers.allCardData).forEach(t => console.log(t.title));
