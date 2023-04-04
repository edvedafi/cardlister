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
    searchLocation: doc.data().location?.toLowerCase(),
    sport: {'nfl': 'football', 'nba': 'basketball', 'mlb': 'baseball', 'nhl': 'hockey'}[doc.data().league]
  });
});
teams.forEach(t => {
  console.log(t)
});
const findTeam = (team, sport) => {
  const searchKey = team.toLowerCase();
  const foundTeam = teams.find(t => t.sport === sport.toLowerCase() && (searchKey === t.searchTeam || searchKey === t.searchLocation));
  if (foundTeam) {
    return `${foundTeam.location} ${foundTeam.team}`;
  } else {
    return team;
  }
}

const output_directory = 'output/';
const titleOutputs = {};

//comment out the body of this to be prompted
const answers = [
  'gameface', 'y', '2021', 'Sore Gameface',
  'Football', 'GF', '15', 'Charles Woodson',
  'packers', 'n', '14', 'Deion Sanders',
  'falcons', 'n', '14', 'n',
  '15', 'n', '13', 'Troy Polamalu',
  'steelers', '', '', '',
  '12', 'Lawrence Taylor', 'giants', '',
  '', '', '11', 'Howie Long',
  'raiders', '', '', '',
  '10', 'John Randle', 'vikings', '',
  '', '', '9', 'Von Miller',
  'broncos', '', '', '',
  '8', 'Myles Garrett', 'browns', '',
  '', '', '7', 'Luke Kuechly',
  'panthers', '90', '', '90',
  '6', 'Ray Lewis', 'ravens', 'y',
  '', 'y', '5', 'TJ Watt',
  'steelers', '90', '', '',
  '4', 'JJ Watt', 'texans', '',
  '', '', '3', 'Nick Bosa',
  '49ers', '', '', '',
  '2', 'Aaron Donald', 'rams', '180',
  '', '180', '1', 'Khalil Mack',
  'bears', '', '', ''
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
let lastCardNumber = 0;

const getName = async () => {
  let cardNumber = await ask(`Card Number${lastCardNumber ? ` [${lastCardNumber}]` : ''}: `) || lastCardNumber;
  if (!cardNumber) {
    cardNumber = lastCardNumber;
  } else {
    lastCardNumber = cardNumber;
  }

  let output = titleOutputs[cardNumber];
  if (output) {
    output.count = output.count + 1;
  } else {
    output = {
      count: 1,
      player: await ask(`Player/Card Name: `),
      year: year || await ask('Year: '),
      setName: setName || await ask('Set Name: '),
      sport: sport || await ask('Sport: '),
      team: findTeam(await ask('Team: '), sport),
    };
    output.title = `${output.year} ${output.setName} ${card_number_prefix}${cardNumber} ${output.player} ${output.team}`;
  }
  titleOutputs[cardNumber] = output;

  return `${output.year}_${output.setName}_${card_number_prefix}${cardNumber}_${output.player}_${output.count}.jpg`.replace(/\s/g, '_');
}

const processImage = async (image, img_number) => {
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

  // await $`magick ${image} -rotate ${rotate}  -crop \`magick ${image} -virtual-pixel edge -blur 0x40 -fuzz 25% -trim -format '%wx%h%O' info: \` +repage ${output_directory}${new_file_name}`;
  await $`magick ${image} -rotate ${rotate} -fuzz 25% -trim ${output_directory}${new_file_name}`;
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
    await processImage(front, 1);
    if (back) {
      await processImage(back, 2);
    }
  }
  //print all the title values in titleOutputs
  Object.values(titleOutputs).forEach(t => console.log(t.title));
} finally {
  console.log(answers);
}
