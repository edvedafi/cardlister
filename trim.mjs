#!/usr/bin/env node
import terminalImage from 'terminal-image';
import {initializeApp} from "firebase/app";
import {collection, getDocs, getFirestore} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDaaJXLcG-RaIJmi9mLXjwqcptcB3_IJRE",
  authDomain: "hofdb-2038e.firebaseapp.com",
  projectId: "hofdb-2038e",
  storageBucket: "hofdb-2038e.appspot.com",
  messagingSenderId: "78796187147",
  appId: "1:78796187147:web:aa89f01d66d63dfc5d490e",
  measurementId: "G-4T1D5KNQ7N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

//load up the possible team names
const teams = [];
const querySnapshot = await getDocs(collection(db, "team"));
querySnapshot.forEach((doc) => {
  teams.push({
    team: doc.data().team,
    searchTeam: doc.data().team?.toLowerCase(),
    location: doc.data().location,
    searchLocation: doc.data().location?.toLowerCase()
  });
});
teams.forEach(t => {
  console.log(t)
});
const findTeam = (team) => {
  const searchKey = team.toLowerCase();
  const foundTeam = teams.find(t => searchKey === t.searchTeam || searchKey === t.searchLocation);
  if (foundTeam) {
    return `${foundTeam.team} ${foundTeam.location}`;
  } else {
    return team;
  }
}

const output_directory = 'output/';
const titleOutputs = [];

//comment out the body of this to be prompted
const answers = [
  'gameface', 'y', '2021', 'Sore Gameface', 'Football', 'y', 'GF'
]

//Helper Functions
const isYes = str => ['yes', 'YES', 'y', 'Y', 'Yes', 'YEs', 'YeS', 'yES'].includes(str);
const isNo = str => ['no', 'NO', 'n', 'N', 'No'].includes(str);

let questionIndex = 0;
const ask = async questionText => {
  let answer;
  if (questionIndex < answers.length) {
    console.log(`${questionText} => ${answers[questionIndex]}`)
    answer = answers[questionIndex];
  } else {
    answer = await question(questionText);
    answers.push(answer);
  }
  questionIndex++;
  return answer;
}

//Start of Script

// Set up full run information
let input_directory = await ask('Input Directory: ');
if (input_directory.indexOf('/') !== input_directory.length - 1) {
  input_directory = `${input_directory}/`;
}
console.log(input_directory)

const isSet = isYes(await ask('Is this a complete set? '));

//Set up an prefixes to the card title
let card_number_prefix = '';
let year, setName, sport;
if (isSet) {
  year = await ask('Year: ');
  setName = await ask('Set Name: ');
  sport = await ask('Sport: ');

  card_number_prefix = await ask('Enter Card Number Prefix: ');
}

//Set up the card name and track with previous for front/back situations
let player;
let img_number = 1;
let lastCardNumber = 0;

const getName = async () => {
  let cardNumber = await ask(`Card Number [${lastCardNumber}]: `);
  if (!cardNumber) {
    cardNumber = lastCardNumber;
  } else {

  }

  const name = await ask(`Player/Card Name [${player}]: `);
  if (name) {
    lastCardNumber++;
    img_number = 1;
    player = name;
  } else if (player) {
    img_number++;
  } else {
    console.log('No Player Name Entered');
    await $`exit 1`;
  }


  //gather information if it is not set yet for year, set name, and sport
  if (!year) {
    year = await ask('Year: ');
  }
  if (!setName) {
    setName = await ask('Set Name: ');
  }
  if (!sport) {
    sport = await ask('Sport: ');
  }

  //gather team name
  const team = findTeam(await ask('Team: '));
  titleOutputs.push(`${year} ${setName} ${card_number_prefix}${cardNumber} ${player} ${team}`);

  return `${year}_${setName}_${card_number_prefix}${cardNumber}_${player.replace(/\s/g, '_')}_${img_number}.jpg`;
}

const processImage = async (image) => {
  console.log(`Entering information for Image ${img_number}`);
  const new_file_name = await getName();
  let rotation = await ask('Rotate? ');
  let rotate;
  if (isYes(rotation)) {
    rotate = -90
  } else if (isNaN(rotation)) {
    rotate = 0;
  } else {
    rotate = rotation || 0;
  }

  await $`magick ${image} -rotate ${rotate}  -crop \`magick ${image} -virtual-pixel edge -blur 0x40 -fuzz 25% -trim -format '%wx%h%O' info: \` +repage ${output_directory}${new_file_name}`;
  console.log(`${image} -> ${new_file_name} Complete`)
}

const lsOutput = await $`ls ${input_directory}PXL*.jpg`;
const files = lsOutput.toString().split('\n')
let i = 0;
try {
  while (i < files.length - 1) {
    const front = files[i++];
    let back;
    if (i < files.length - 1) {
      back = files [i++];
    }
    console.log(await terminalImage.file(front, {height: 30}));
    if (back) {
      console.log(await terminalImage.file(back, {height: 30}));
    }
    await processImage(front);
    if (back) {
      await processImage(back);
    }
  }
  titleOutputs.forEach(t => console.log(t));
} finally {
  console.log(answers);
}

