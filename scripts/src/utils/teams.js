//load up the possible team names
import { useSpinners } from './spinners.js';
import { getFirestore } from './firebase.js';

const teams = [];
const allTeams = {
  football: [],
  basketball: [],
  baseball: [],
  hockey: [],
  other: [],
};

export const leagues = {
  nfl: 'football',
  nba: 'basketball',
  mlb: 'baseball',
  nhl: 'hockey',
  nlf: 'football',
  ncaa: 'football',
  baseball: 'baseball',
  mnl: 'baseball',
};

const { showSpinner } = useSpinners('teams', '#ffc107');
export const loadTeams = async () => {
  const { update, finish, error } = showSpinner('loadTeams', 'Loading teams');
  update('Firestore');
  const db = getFirestore();
  update('Query');
  const querySnapshot = await db.collection('team').get();
  update('Processing');
  querySnapshot.forEach((doc) => {
    const sport = findSport(doc.data().league);
    const team = {
      team: doc.data().team,
      searchTeam: doc.data().team?.toLowerCase(),
      location: doc.data().location,
      searchLocation: doc.data().location?.toLowerCase(),
      sport: sport,
      league: doc.data().league,
      searchExact: `${doc.data().location?.toLowerCase()} ${doc.data().team?.toLowerCase()}`,
      startYear: doc.data().startYear || '1800',
      endYear: doc.data().endYear || '9999',
      display: `${doc.data().location} ${doc.data().team}`,
    };
    teams.push(team);
    if (allTeams[sport]) {
      allTeams[sport].push(team);
    } else {
      allTeams['other'].push(team);
    }
  });

  update('Sorting');
  allTeams['football'] = allTeams['football'].sort((a, b) => {
    if (a.league === 'ncaa' && b.league === 'nfl') {
      return 1;
    } else if (a.league === 'nfl' && b.league === 'ncaa') {
      return -1;
    } else {
      if (a.endYear && !b.endYear) {
        return 1;
      } else if (!a.endYear && b.endYear) {
        return -1;
      } else {
        return a.searchExact.localeCompare(b.searchExact);
      }
    }
  });
  finish('Loaded Teams');
};

export let isTeam = (team, sport, year) => {
  const testYear = year || 2000;
  const searchKey = team.toLowerCase();
  // console.log('searching for team', searchKey, sport,);
  // console.log('searching for team', searchKey, sport, teams);
  let foundTeam;
  if (sport) {
    foundTeam = allTeams[sport.toLowerCase()].find(
      (t) =>
        (searchKey === t.searchTeam || searchKey === t.searchLocation || searchKey === t.searchExact) &&
        t.startYear <= testYear &&
        (!t.endYear || t.endYear >= testYear),
    );
  } else {
    sports.find((s) => {
      // console.log('searching for team', searchKey, s)
      foundTeam = isTeam(team, s);
      return foundTeam;
    });
  }
  // console.log('found team', foundTeam);
  return foundTeam;
};

export const findTeam = (team, sport, year) => {
  return isTeam(team, sport, year) || [team, team];
};

export const findSport = (league) => {
  return leagues[league.toLowerCase()];
};

export const findLeague = (sport) => {
  return Object.keys(leagues).find((key) => leagues[key] === sport.toLowerCase());
};

export const sports = Object.keys(allTeams);

export const getTeams = (sport) => {
  return allTeams[sport].map(
    (team) =>
      `${team.location} ${team.team}${
        team.endYear && team.endYear < 9999 ? ` (${team.startYear}-${team.endYear})` : ''
      }`,
  );
};

export const getTeamSelections = (sport) =>
  allTeams[sport]
    ? [{ name: '(No Team)', description: 'N/A', value: '' }].concat(
        allTeams[sport].map((team) => ({
          name: `${team.location} ${team.team}`,
          description: `${team.location} ${team.team}${
            team.endYear && team.endYear < 9999 ? ` (${team.startYear}-${team.endYear})` : ''
          }`,
          value: team,
        })),
      )
    : [];

// export const getSportOfTeam = (team) => teams.find((t) => t.display === team)?.sport;
export const findTeamInString = (title) => {
  // console.log('looking for sport of team', title);
  // console.log(
  //   'teams',
  //   teams.map((t) => t.display),
  // );
  return teams.find((t) => {
    // if (t.display === 'Kansas City Chiefs') {
    //   console.log('Chiefs: ', title.indexOf(t.display), t.sport);
    // }
    return title.indexOf(t.display) > -1;
  })?.sport;
};
