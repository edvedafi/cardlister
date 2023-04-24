//load up the possible team names
import {getFirestore} from "firebase-admin/firestore";

const teams = [];

const leagues = {'nfl': 'football', 'nba': 'basketball', 'mlb': 'baseball', 'nhl': 'hockey'};

export const loadTeams = async (app) => {
  const db = getFirestore(app);
  const querySnapshot = await db.collection('team').get();
  querySnapshot.forEach((doc) => {
    if (!doc.data().endYear) {
      teams.push({
        team: doc.data().team,
        searchTeam: doc.data().team?.toLowerCase(),
        location: doc.data().location,
        searchLocation: doc.data().location?.toLowerCase(),
        sport: findSport(doc.data().league),
        league: doc.data().league
      });
    }
  });
}

export const findTeam = (team, sport) => {
  const searchKey = team.toLowerCase();
  const foundTeam = teams.find(t => t.sport === sport.toLowerCase() && (searchKey === t.searchTeam || searchKey === t.searchLocation));
  if (foundTeam) {
    return `${foundTeam.location} ${foundTeam.team}`;
  } else {
    return team;
  }
}

export const findSport = (league) => {
  return leagues[league.toLowerCase()];
}

export const findLeague = (sport) => {
  return Object.keys(leagues).find(key => leagues[key] === sport.toLowerCase());
}
