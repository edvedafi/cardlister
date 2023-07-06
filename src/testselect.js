import filterSelectPrompt from "./utils/filterSelectPrompt.js";
import { getTeamSelections, loadTeams } from "./utils/teams.js";
import dotenv from 'dotenv';
import { readFileSync} from 'fs';
import {cert, initializeApp} from "firebase-admin/app";
dotenv.config();


const hofDBJSON = JSON.parse(readFileSync('./hofdb-2038e-firebase-adminsdk-jllij-4025146e4e.json'));
const firebaseConfig = {
  credential: cert(hofDBJSON),
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "hofdb-2038e.firebaseapp.com",
  projectId: "hofdb-2038e",
  storageBucket: "hofdb-2038e.appspot.com",
  messagingSenderId: "78796187147",
  appId: "1:78796187147:web:aa89f01d66d63dfc5d490e",
  measurementId: "G-4T1D5KNQ7N"
};
const app = initializeApp(firebaseConfig);
await loadTeams(app);

const value = await filterSelectPrompt({
  message: 'Select a card',
  choices: [
    { value: 'football' },
    { value: 'baseball' },
    { value: 'basketball' },
  ],
  'default': 'football',
});
console.log('value: ', value);

const teams = getTeamSelections(value);
// console.log(teams);

let defaultTeam = teams[13].value;
console.log(defaultTeam)

const team = await filterSelectPrompt({
  message: 'Select a card',
  choices: teams,
  'default': defaultTeam,
  cancelable: true
});

console.log(`team: ${team.display}`);