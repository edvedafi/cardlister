//load up the possible team names
import {getFirestore} from "firebase-admin/firestore";

const teams = [];
const allTeams = {
  'football': [],
  'basketball': [],
  'baseball': [],
  'hockey': [],
  'other': [],
};

export const leagues = {
  'nfl': 'football',
  'nba': 'basketball',
  'mlb': 'baseball',
  'nhl': 'hockey',
  'nlf': 'football',
  'ncaa': 'football',
  'baseball': 'baseball',
  'mnl': 'baseball',
};

export const loadTeams = async (app) => {
  const db = getFirestore(app);
  const querySnapshot = await db.collection('team').get();
  querySnapshot.forEach((doc) => {
    const sport = findSport(doc.data().league)
    const team = {
      team: doc.data().team,
      searchTeam: doc.data().team?.toLowerCase(),
      location: doc.data().location,
      searchLocation: doc.data().location?.toLowerCase(),
      sport: sport,
      league: doc.data().league,
      searchExact: `${doc.data().location?.toLowerCase()} ${doc.data().team?.toLowerCase()}`
    }
    teams.push(team);
    if (allTeams[sport]) {
      allTeams[sport].push(team);
    } else {
      allTeams['other'].push(team);
    }
  });
}

export const isTeam = (team, sport, year) => {
  const testYear = year || 2000;
  const searchKey = team.toLowerCase();
  // console.log('searching for team', searchKey, sport,);
  // console.log('searching for team', searchKey, sport, teams);
  let foundTeam;
  if (sport) {
    foundTeam = allTeams[sport.toLowerCase()].find(t =>
      (searchKey === t.searchTeam || searchKey === t.searchLocation || searchKey === t.searchExact)
      && (t.startYear <= testYear
        && (!t.endYear || t.endYear >= testYear))
    );
  } else {
    sports.find(s => {
      // console.log('searching for team', searchKey, s)
      foundTeam = isTeam(team, s);
      return foundTeam;
    });
  }
  // console.log('found team', foundTeam);
  return foundTeam ? foundTeam.team ? [`${foundTeam.location} ${foundTeam.team}`, foundTeam.team, foundTeam.sport] : foundTeam : false;
}

export const findTeam = (team, sport, year) => {
  return isTeam(team, sport, year) || [team, team];
}

export const findSport = (league) => {
  return leagues[league.toLowerCase()];
}

export const findLeague = (sport) => {
  return Object.keys(leagues).find(key => leagues[key] === sport.toLowerCase());
}

export const sports = Object.keys(allTeams);
