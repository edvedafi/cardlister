import { getGroup, getGroupByBin, updateGroup } from '../listing-sites/firebase.js';
import { findSetId } from '../listing-sites/sportlots.js';
import { useSpinners } from '../utils/spinners.js';
import { getAllListings } from '../listing-sites/bsc.js';
import { ask } from '../utils/ask.js';
import { findLeague, getTeamSelections } from '../utils/teams.js';

const color = chalk.white;
const { showSpinner, log } = useSpinners('setData', color);
export default async function getSetData(defaultValues) {
  const { update, finish, error } = showSpinner('getSetData', 'Getting set data');
  try {
    let setInfo = { ...defaultValues };

    if (defaultValues.bin) {
      update(`Bin: ${defaultValues.bin}`);
      setInfo = await getGroupByBin(defaultValues.bin);
    } else {
      update('Gathering');
      setInfo = await findSetId(defaultValues);
      setInfo.league = findLeague(setInfo.sport);
      update(`Firebase lookup ${JSON.stringify(setInfo)}`);
      setInfo = await getGroup(setInfo);
      if (!setInfo.bscFilters) {
        update('BSC');
        const { body } = await getAllListings(setInfo);
        setInfo.bscFilters = body;
        await updateGroup({ bin: setInfo.bin, bscFilters: body });
      }
    }

    log(setInfo);
    update('Gather Extra Info');
    if (await ask('Update Set Details?', false)) {
      const updates = {};
      const updateInfo = async (key, display, defaultIfNull) => {
        const response = await ask(display, setInfo[key] || defaultIfNull);
        if (response && response.length > 0) {
          updates[key] = response;
        }
      };
      await updateInfo('player', 'Player');
      const team = await ask('Team', setInfo.team, {
        selectOptions: getTeamSelections(setInfo.sport),
      });
      if (team) {
        updates.team = team;
      }
      await updateInfo('features', 'Features');
      await updateInfo('printRun', 'Print Run');
      await updateInfo('autographed', 'Autograph');
      await updateInfo('graded', 'Graded');
      await updateInfo('card_number_prefix', 'Card Number Prefix');
      await updateInfo('price', 'Default Price', 0.99);
      await updateInfo('bscPrice', 'BSC Price', 0.25);
      await updateInfo('slPrice', 'SportLots Price', 0.18);
      if (Object.keys(updates).length > 0) {
        setInfo = await updateGroup({ bin: setInfo.bin, ...updates });
      }
    }
    finish();
    return setInfo;
  } catch (e) {
    error(e);
    throw e;
  }
}
