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

const leagues = {
  'nfl': 'football',
  'nba': 'basketball',
  'mlb': 'baseball',
  'nhl': 'hockey',
  'nlf': 'football',
  'baseball': 'baseball',
  'mnl': 'baseball',
};

export const loadTeams = async (app) => {
  const db = getFirestore(app);
  const querySnapshot = await db.collection('team').get();
  querySnapshot.forEach((doc) => {
    if (!doc.data().endYear) {
      const sport = findSport(doc.data().league)
      const team = {
        team: doc.data().team,
        searchTeam: doc.data().team?.toLowerCase(),
        location: doc.data().location,
        searchLocation: doc.data().location?.toLowerCase(),
        sport: sport,
        league: doc.data().league
      }
      teams.push(team);
      if (allTeams[sport]) {
        allTeams[sport].push(team);
      } else {
        allTeams['other'].push(team);
      }
    }
  });
}

export const findTeam = (team, sport) => {
  const searchKey = team.toLowerCase();
  // console.log('searching for team', searchKey, sport, teams);
  const foundTeam = allTeams[sport.toLowerCase()].find(t => searchKey === t.searchTeam || searchKey === t.searchLocation);
  if (foundTeam) {
    return [`${foundTeam.location} ${foundTeam.team}`, foundTeam.team];
  } else {
    return [team, team];
  }
}

export const findSport = (league) => {
  return leagues[league.toLowerCase()];
}

export const findLeague = (sport) => {
  return Object.keys(leagues).find(key => leagues[key] === sport.toLowerCase());
}

export const sports = Object.keys(allTeams);
