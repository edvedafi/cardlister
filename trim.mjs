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
  if (!doc.data().endYear) {
    teams.push({
      team: doc.data().team,
      searchTeam: doc.data().team?.toLowerCase(),
      location: doc.data().location,
      searchLocation: doc.data().location?.toLowerCase(),
      sport: {'nfl': 'football', 'nba': 'basketball', 'mlb': 'baseball', 'nhl': 'hockey'}[doc.data().league],
      league: doc.data().league
    });
  }
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
  'throwback', 'y', '2021',
  'Score', 'football', '1991 Rookie Throwbacks',
  'n', 'TB', '1',
  'Trevor Lawrence', 'Jaguars RC', '',
  '', 'y', '2',
  'Justin Fields', 'Bears RC', '',
  '', 'y', '3',
  'Trey Lance', '49ers RC', '',
  '', 'y', '4',
  'DeVonta Smith', 'Eagles RC', '',
  '', 'y', '5',
  "Ja'Marr Chase", 'Bengals RC', '',
  '', 'y', '6',
  'Kyle Pitts', 'Falcons RC', '',
  '', 'y', '7',
  'Jalen Waddle', 'Eagles RC', '',
  '', 'y', '8',
  'Zach Wilson', 'Jets RC', '',
  '', 'y', '9',
  'Mac Jones', 'Patriots RC', '',
  '', 'y', '10',
  'Kyle Trask', 'Buccaneers RC', '',
  '', 'y'
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
let year, setName, sport, insert, parallel, features;
if (isSet) {
  year = await ask('Year: ');
  setName = await ask('Set Name: ');
  sport = await ask('Sport: ');
  insert = await ask('Insert: ');
  parallel = await ask('Parallel: ');
  features = await ask('Features: ');

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
      features: features || await ask('Features (RC, #/, etc): '),
    };
    if (!isNo(parallel)) {
      output.parallel = parallel || await ask('Parallel: ');
    }
    if (!isNo(insert)) {
      output.insert = insert || await ask('Insert: ');
    }
    output.team = findTeam(await ask('Team: '), output.sport);
    //try to get to the best 80 character title that we can
    output.title = `${output.year} ${output.setName}${output.insert ? ` ${output.insert} insert` : ' '}${output.parallel ? `${output.parallel} parallel` : ''} #${card_number_prefix}${cardNumber} ${output.player} ${output.team} ${output.features}`;
    if (output.title.length > 80) {
      output.title = `${output.year} ${output.setName}${output.insert ? ` ${output.insert} insert` : ' '}${output.parallel ? `${output.parallel} parallel` : ''} #${card_number_prefix}${cardNumber} ${output.player} ${output.team.slice(output.team.indexOf(' '))} ${output.features}`;
    }
    if (output.title.length > 80) {
      output.title = `${output.year} ${output.setName}${output.insert ? ` ${output.insert}` : ' '}${output.parallel ? `${output.parallel} ` : ''} #${card_number_prefix}${cardNumber} ${output.player} ${output.team.slice(output.team.indexOf(' '))} ${output.features}`;
    }
    if (output.title.length > 80) {
      output.title = `${output.year} ${output.setName}${output.insert ? ` ${output.insert}` : ' '}${output.parallel ? `${output.parallel} ` : ''} #${card_number_prefix}${cardNumber} ${output.player} ${output.team.slice(output.team.indexOf(' '))}`;
    }
  }

  output.directory = `${output.year}/${output.setName}${output.insert ? `/${output.insert}` : ''}${output.parallel ? `/${output.parallel}` : ''}/`;
  output.filename = `${card_number_prefix}${cardNumber}_${output.player}_${output.count}.jpg`.replace(/\s/g, '_');

  titleOutputs[cardNumber] = output;

  return output
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

  await $`mkdir -p ${output_directory}${new_file_name.directory}`;

  // await $`magick ${image} -rotate ${rotate}  -crop \`magick ${image} -virtual-pixel edge -blur 0x40 -fuzz 25% -trim -format '%wx%h%O' info: \` +repage ${output_directory}${new_file_name}`;
  await $`magick ${image} -rotate ${rotate} -fuzz 45% -trim ${output_directory}${new_file_name.directory}/${new_file_name.filename}`;
  console.log(`${image} -> ${new_file_name} Complete`)
}

const lsOutput = await $`ls ${input_directory}PXL*.jpg`;
const files = lsOutput.toString().split('\n')
let i = 0;
try {
  while (i < files.length - 1) {
    //print answers for debugging
    console.log(answers);
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
} finally {
  //print all the title values in titleOutputs
  Object.values(titleOutputs).forEach(t => console.log(t.title));
  await $`exit`;
}
