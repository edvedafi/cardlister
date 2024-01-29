import { getGroup, getGroupByBin, updateGroup } from '../listing-sites/firebase.js';
import { findSetId } from '../listing-sites/sportlots.js';
import { useSpinners } from '../utils/spinners.js';
import { findSetInfo } from '../listing-sites/bsc.js';
import { ask } from '../utils/ask.js';
import { findLeague, getTeamSelections } from '../utils/teams.js';
import chalk from 'chalk';

const { showSpinner, log } = useSpinners('setData', chalk.white);
export default async function getSetData(defaultValues, collectDetails = true) {
  const { update, finish, error } = showSpinner('getSetData', 'Getting set data');
  try {
    let setInfo = { ...defaultValues };

    if (defaultValues.bin) {
      update(`Bin: ${defaultValues.bin}`);
      setInfo = await getGroupByBin(defaultValues.bin);
    } else {
      update('Gathering');
      setInfo = await findSetId(defaultValues);
      if (!setInfo.sportlots.skip) {
        setInfo.league = findLeague(setInfo.sport);
        update(`Firebase lookup ${JSON.stringify(setInfo)}`);
        setInfo = await getGroup(setInfo);
      }
      if (!setInfo.bscFilters) {
        update('BSC');
        setInfo = {
          ...setInfo,
          ...(await findSetInfo(setInfo)),
        };
        if (setInfo.bscFilters) {
          if (!setInfo.bin) {
            setInfo = {
              ...(await getGroup(setInfo)),
              bscFilters: setInfo.bscFilters,
              sportlots: setInfo.sportlots,
            };
          }
          await updateGroup({ bin: setInfo.bin, bscFilters: setInfo.bscFilters });
        } else {
          throw new Error(`Unable to find set info for ${JSON.stringify(setInfo)}`);
        }
      }
    }

    update('Gather Extra Info');
    if (collectDetails && (await ask('Update Set Details?', false))) {
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
