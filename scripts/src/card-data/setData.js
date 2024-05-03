import { getGroup, getGroupByBin, getGroupBySportlotsId, updateGroup } from '../listing-sites/firebase.js';
import {
  findSetId,
  findSetList,
  getSLBrand,
  getSLSet,
  getSLSport,
  getSLYear,
  updateSetBin,
} from '../listing-sites/sportlots.js';
import { useSpinners } from '../utils/spinners.js';
import {
  findSetInfo,
  getBSCCards,
  getBSCSetFilter,
  getBSCSportFilter,
  getBSCVariantNameFilter,
  getBSCVariantTypeFilter,
  getBSCYearFilter,
  updateBSCSKU,
} from '../listing-sites/bsc.js';
import { ask } from '../utils/ask.js';
import { findLeague, getTeamSelections } from '../utils/teams.js';
import chalk from 'chalk';
import { convertTitleToCard } from '../listing-sites/uploads.js';
import {
  createCategory,
  createCategoryActive,
  getCategories,
  setCategoryActive,
  updateCategory,
} from '../listing-sites/medusa.js';

const { showSpinner, log } = useSpinners('setData', chalk.white);

const askNew = async (display, options) => {
  const selectOptions = options.sort((a, b) => a.name.localeCompare(b.name));
  selectOptions.push({ value: 'New', name: 'New' });
  const response = await ask(display, undefined, { selectOptions: selectOptions });
  if (response === 'New') {
    return null;
  }
  return response;
};

export async function getCategoriesAsOptions(parent_category_id) {
  const categories = await getCategories(parent_category_id);
  return categories.map((category) => ({
    value: category,
    name: category.name,
  }));
}

export async function findSet() {
  const { update, finish, error } = showSpinner('findSet', 'Finding Set');
  let setInfo = { handle: '' };
  try {
    update('Sport');
    const sportCategories = await getCategoriesAsOptions(process.env.MEDUSA_ROOT_CATEGORY);
    if (sportCategories.length > 0) {
      setInfo.sport = await askNew('Sport', sportCategories);
    }
    if (setInfo.sport) {
      setInfo.handle = setInfo.sport.handle;
    } else {
      update('New Sport');
      const sportlots = await getSLSport();
      setInfo.handle = sportlots.name;
      setInfo.sport = await createCategory(sportlots.name, process.env.MEDUSA_ROOT_CATEGORY, setInfo.handle, {
        sportlots: sportlots.key,
      });
    }
    if (!setInfo.sport.metadata?.sportlots) {
      update('Add SportLots to Sport');
      const slSport = await getSLSport(setInfo.sport.name);
      setInfo.sport = await updateCategory(setInfo.sport.id, { ...setInfo.sport.metadata, sportlots: slSport.key });
    }
    if (!setInfo.sport.metadata?.bsc) {
      update('Add BSC to Sport');
      const bscSport = await getBSCSportFilter(setInfo.sport.name);
      setInfo.sport = await updateCategory(setInfo.sport.id, { ...setInfo.sport.metadata, bsc: bscSport.filter });
    }

    update('Brand');
    const brandCategories = await getCategoriesAsOptions(setInfo.sport.id);
    if (brandCategories.length > 0) {
      setInfo.brand = await askNew('brand', brandCategories);
    }
    if (setInfo.brand) {
      setInfo.handle = setInfo.brand.handle;
    } else {
      update('New brand');
      const slBrand = await getSLBrand();
      setInfo.handle = `${setInfo.sport.handle}-${slBrand.name}`;
      setInfo.brand = await createCategory(slBrand.name, setInfo.sport.id, setInfo.handle, { sportlots: slBrand.key });
    }
    if (!setInfo.brand.metadata?.sportlots) {
      update('Add SportLots to brand');
      const slBrand = await getSLBrand(setInfo.brand);
      setInfo.brand = await updateCategory(setInfo.brand.id, { ...setInfo.brand.metadata, sportlots: slBrand.key });
    }

    update('Year');
    const years = await getCategoriesAsOptions(setInfo.brand.id);
    if (years.length > 0) {
      setInfo.year = await askNew('Year', years);
    }
    if (setInfo.year) {
      setInfo.handle = setInfo.year.handle;
    } else {
      update('New Year');
      const newYear = await ask('New Year');
      setInfo.handle = `${setInfo.brand.handle}-${newYear}`;
      setInfo.year = await createCategory(newYear, setInfo.brand.id, setInfo.handle, {
        sportlots: getSLYear(newYear),
        bsc: getBSCYearFilter(newYear),
      });
    }

    update('Set');
    const setCategories = await getCategoriesAsOptions(setInfo.year.id);
    if (setCategories.length > 0) {
      setInfo.set = await askNew('Set', setCategories);
    }
    if (setInfo.set) {
      setInfo.handle = setInfo.set.handle;
    } else {
      update('New Set');
      const bscSet = await getBSCSetFilter(setInfo);
      setInfo.handle = `${setInfo.year.handle}-${bscSet.name}`;
      setInfo.set = await createCategory(bscSet.name, setInfo.year.id, setInfo.handle, { bsc: bscSet.filter });
    }

    update('Variant Type');
    const variantTypeCategories = await getCategoriesAsOptions(setInfo.set.id);
    if (variantTypeCategories.length > 0) {
      setInfo.variantType = await askNew('Variant Type', variantTypeCategories);
    }
    if (setInfo.variantType) {
      setInfo.handle = setInfo.variantType.handle;
    } else {
      update('New Variant Type');
      const bscVariantType = await getBSCVariantTypeFilter(setInfo);
      setInfo.handle = `${setInfo.set.handle}-${bscVariantType.name}`;
      if (bscVariantType.name === 'Base') {
        setInfo.handle = `${setInfo.set.handle}-${bscVariantType.name}-base`;
        const description =
          setInfo.variantType?.description || (await ask('Set Title', `${setInfo.year.name} ${setInfo.set.name}`));
        setInfo.variantType = await createCategoryActive(
          bscVariantType.name,
          description,
          setInfo.set.id,
          setInfo.handle,
          {
            bsc: bscVariantType.filter,
            sportlots: await getSLSet(setInfo),
          },
        );
      } else {
        setInfo.variantType = await createCategory(bscVariantType.name, setInfo.set.id, setInfo.handle, {
          bsc: bscVariantType.filter,
        });
      }
    }

    if (!setInfo.variantType.handle.endsWith('-base')) {
      update('Variant Name');
      const variantNameCategories = await getCategoriesAsOptions(setInfo.variantType.id);
      if (variantNameCategories.length > 0) {
        setInfo.variantName = await askNew('Variant Name', variantNameCategories);
      }
      if (setInfo.variantName) {
        setInfo.handle = setInfo.variantName.handle;
      } else {
        update('New Variant Name');
        const bscVariantName = await getBSCVariantNameFilter(setInfo);
        setInfo.handle = `${setInfo.variantType.handle}-${bscVariantName.name}`;
        setInfo.variantName = await createCategory(bscVariantName.name, setInfo.variantType.id, setInfo.handle, {
          bsc: bscVariantName.filter,
        });
      }
      const updates = {};
      if (!setInfo.variantName.metadata?.sportlots) {
        updates.sportlots = await getSLSet(setInfo);
      }
      let description;
      if (!setInfo.variantName.description) {
        description = await ask('Set Title', `${setInfo.year.name} ${setInfo.set.name} ${setInfo.variantName.name}`);
      }

      if (Object.keys(updates).length > 0 || description || !setInfo.variantName.is_active) {
        setInfo.variantName = await setCategoryActive(setInfo.variantName.id, description, {
          ...setInfo.variantName.metadata,
          ...updates,
        });
      }
    }

    finish();
    return setInfo;
  } catch (e) {
    error(e);
    throw e;
  }
}

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
        setInfo = await findSetInfo(setInfo);
        if (setInfo.bscFilters) {
          if (!setInfo.bin) {
            setInfo = {
              ...(await getGroup(setInfo)),
              bscFilters: setInfo.bscFilters,
              sportlots: setInfo.sportlots,
            };
          } else {
            await updateGroup(setInfo);
          }
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

export async function assignIds() {
  const { update, finish } = showSpinner('setInfo', 'Find SetInfo');
  const sets = await findSetList();
  let setInfo = {};
  let complete = 0;
  update(`${complete}/${sets.length}`);
  for (const set of sets) {
    const { update: updateSet, error: errorSet, finish: finishSet } = showSpinner(set.linkText, set.linkText);
    log(`Enter Data for ${set.linkText}`);
    try {
      updateSet('Firebase');
      setInfo = await getGroupBySportlotsId(set.sportlots.id);
      if (!setInfo) {
        updateSet('Finding SetInfo via BSC');
        setInfo = await findSetInfo(convertTitleToCard(set.linkText));
        if (setInfo.bscFilters) {
          updateSet('Saving to Firebase');
          setInfo = await getGroup(setInfo);
        }
      }

      if (!setInfo.bscFilters) {
        updateSet('Adding BSC Filters');
        setInfo = await findSetInfo(setInfo);
        if (setInfo.bscFilters) {
          updateSet('Saving to Firebase');
          setInfo = await updateGroup(setInfo);
        } else {
          errorSet(`Could not find set info for ${set.linkText}`);
        }
      }

      if (!setInfo.sportlots || !setInfo.sportlots.id || !setInfo.sportlots.text) {
        updateSet('Adding Sportlots Info');
        await updateGroup({
          bin: setInfo.bin,
          sportlots: {
            ...set.sportlots,
            text: set.linkText,
          },
        });
        setInfo = {
          ...setInfo,
          sportlots: {
            ...set.sportlots,
            text: set.linkText,
          },
        };
      }

      updateSet('Saving SportLots updates');
      const counts = await updateSetBin(set, setInfo);
      // log(counts);
      updateSet('Saving BSC updates');
      await updateBSCSKU(setInfo, counts);

      complete++;
      finishSet(`${set.linkText} => ${setInfo.bin}`);
      update(`${complete}/${sets.length}`);
    } catch (e) {
      errorSet(e, `${JSON.stringify(set)}|${JSON.stringify(setInfo)}`);
    }
  }
  finish('Found All Set IDS');
}

export async function buildSet(category) {
  const { update, finish, error } = showSpinner('buildSet', 'Building Set');
  try {
    update('Building Set');
    const cards = await getBSCCards(category);
    log(cards);
    finish('Set Built');
  } catch (e) {
    error(e);
    throw e;
  }
}
