import { await createGroups } from './uploads.js';

jest.mock('../utils/ask.js');
jest.mock('../utils/inputs.js');
jest.mock('chalk', () => jest.fn());
jest.mock('open', () => jest.fn());

const examples = {
  base: {
    card: {
      cardNumber: 3,
      sport: 'football',
      year: '2020',
      manufacture: 'panini',
      setName: 'base set',
      title: 'base card',
      quantity: 1,
      bin: 1,
    },
    another: {
      cardNumber: 7,
      sport: 'football',
      year: '2020',
      manufacture: 'panini',
      setName: 'base set',
      title: 'another base card',
      quantity: 1,
      bin: 1,
    },
  },
  insert: {
    card: {
      cardNumber: 1,
      sport: 'football',
      year: '2020',
      manufacture: 'panini',
      setName: 'base set',
      insert: 'insert set',
      title: 'insert card',
      quantity: 1,
      bin: 2,
    },
    another: {
      cardNumber: 42,
      sport: 'football',
      year: '2020',
      manufacture: 'panini',
      setName: 'base set',
      insert: 'another insert set',
      title: 'another insert card',
      quantity: 1,
      bin: 8,
    },
  },
  parallel: {
    card: {
      cardNumber: 17,
      sport: 'football',
      year: '2020',
      manufacture: 'panini',
      setName: 'base set',
      parallel: 'parallel set',
      title: 'parallel card',
      quantity: 1,
      bin: 3,
    },
    shiny: {
      cardNumber: 5,
      sport: 'football',
      year: '2020',
      manufacture: 'panini',
      setName: 'base set',
      parallel: 'shiny parallel set',
      title: 'shiny parallel card',
      quantity: 1,
      bin: 9,
    },
  },
  insert_parallel: {
    card: {
      cardNumber: 9,
      sport: 'football',
      year: '2020',
      manufacture: 'panini',
      setName: 'base set',
      insert: 'insert set',
      parallel: 'parallel set',
      title: 'insert parallel card',
      quantity: 1,
      bin: 4,
    },
    second_insert_same_parallel: {
      cardNumber: 26,
      sport: 'football',
      year: '2020',
      manufacture: 'panini',
      setName: 'base set',
      insert: 'second insert set',
      parallel: 'parallel set',
      title: 'second insert same parallel card',
      quantity: 1,
      bin: 5,
    },
    second_parallel_same_insert: {
      cardNumber: 73,
      sport: 'football',
      year: '2020',
      manufacture: 'panini',
      setName: 'base set',
      insert: 'insert set',
      parallel: 'second parallel set',
      title: 'second parallel same insert card',
      quantity: 1,
      bin: 6,
    },
    third_insert_third_parallel: {
      cardNumber: 13,
      sport: 'football',
      year: '2020',
      manufacture: 'panini',
      setName: 'base set',
      insert: 'third insert set',
      parallel: 'third parallel set',
      title: 'third insert third parallel card',
      quantity: 1,
      bin: 7,
    },
  },
};

describe('uploads', () => {
  describe('await createGroups', () => {
    it('should sort sll cards into each of the groups', async () => {
      const allCards = {
        3: examples.base.card,
        7: examples.base.another,
        1: examples.insert.card,
        42: examples.insert.another,
        17: examples.parallel.card,
        5: examples.parallel.shiny,
        9: examples.insert_parallel.card,
        26: examples.insert_parallel.second_insert_same_parallel,
        73: examples.insert_parallel.second_parallel_same_insert,
        13: examples.insert_parallel.third_insert_third_parallel,
      };
      const bulk = undefined;

      const result = await createGroups(allCards, bulk);

      expect(result).toContainAllKeys(['1', '2', '8', '3', '9', '4', '5', '6', '7']);

      expect(result['1']).toIncludeSameMembers([examples.base.card, examples.base.another]);
      expect(result['2']).toIncludeSameMembers([examples.insert.card]);
      expect(result['8']).toIncludeSameMembers([examples.insert.another]);
      expect(result['3']).toIncludeSameMembers([examples.parallel.card]);
      expect(result['9']).toIncludeSameMembers([examples.parallel.shiny]);
      expect(result['4']).toIncludeSameMembers([examples.insert_parallel.card]);
      expect(result['5']).toIncludeSameMembers([examples.insert_parallel.second_insert_same_parallel]);
      expect(result['6']).toIncludeSameMembers([examples.insert_parallel.second_parallel_same_insert]);
      expect(result['7']).toIncludeSameMembers([examples.insert_parallel.third_insert_third_parallel]);
    });
    //   Football|2021|panini|chronicles|gridiron-kings|pink|1
    it('should generate the same result whether bulk or all cards', async () => {
      const allCards = undefined;
      const bulk = [
        examples.base.card,
        examples.base.another,
        examples.insert.card,
        examples.insert.another,
        examples.parallel.card,
        examples.parallel.shiny,
        examples.insert_parallel.card,
        examples.insert_parallel.second_insert_same_parallel,
        examples.insert_parallel.second_parallel_same_insert,
        examples.insert_parallel.third_insert_third_parallel,
      ];

      const result = await createGroups(allCards, bulk);

      expect(result).toContainAllKeys(['1', '2', '8', '3', '9', '4', '5', '6', '7']);

      expect(result['1']).toIncludeSameMembers([examples.base.card, examples.base.another]);
      expect(result['2']).toIncludeSameMembers([examples.insert.card]);
      expect(result['8']).toIncludeSameMembers([examples.insert.another]);
      expect(result['3']).toIncludeSameMembers([examples.parallel.card]);
      expect(result['9']).toIncludeSameMembers([examples.parallel.shiny]);
      expect(result['4']).toIncludeSameMembers([examples.insert_parallel.card]);
      expect(result['5']).toIncludeSameMembers([examples.insert_parallel.second_insert_same_parallel]);
      expect(result['6']).toIncludeSameMembers([examples.insert_parallel.second_parallel_same_insert]);
      expect(result['7']).toIncludeSameMembers([examples.insert_parallel.third_insert_third_parallel]);
    });

    it('should generate the same result when in both bulk or all cards', async () => {
      const allCards = {
        3: examples.base.card,
        42: examples.insert.another,
        17: examples.parallel.card,
        9: examples.insert_parallel.card,
        73: examples.insert_parallel.second_parallel_same_insert,
        13: examples.insert_parallel.third_insert_third_parallel,
      };
      const bulk = [
        examples.base.another,
        examples.insert.card,
        examples.parallel.shiny,
        examples.insert_parallel.second_insert_same_parallel,
      ];

      const result = await createGroups(allCards, bulk);

      expect(result).toContainAllKeys(['1', '2', '8', '3', '9', '4', '5', '6', '7']);

      expect(result['1']).toIncludeSameMembers([examples.base.card, examples.base.another]);
      expect(result['2']).toIncludeSameMembers([examples.insert.card]);
      expect(result['8']).toIncludeSameMembers([examples.insert.another]);
      expect(result['3']).toIncludeSameMembers([examples.parallel.card]);
      expect(result['9']).toIncludeSameMembers([examples.parallel.shiny]);
      expect(result['4']).toIncludeSameMembers([examples.insert_parallel.card]);
      expect(result['5']).toIncludeSameMembers([examples.insert_parallel.second_insert_same_parallel]);
      expect(result['6']).toIncludeSameMembers([examples.insert_parallel.second_parallel_same_insert]);
      expect(result['7']).toIncludeSameMembers([examples.insert_parallel.third_insert_third_parallel]);
    });

    it('should not include cards with a quantity of zero', async () => {
      //build a few base cards to mix in
      const base3 = {
        cardNumber: 3,
        sport: 'football',
        year: '2020',
        manufacture: 'panini',
        setName: 'base set',
        title: 'base card 3',
        quantity: 2,
        bin: 1,
      };
      const base7 = {
        cardNumber: 7,
        sport: 'football',
        year: '2020',
        manufacture: 'panini',
        setName: 'base set',
        title: 'base card 7',
        quantity: 1,
        bin: 1,
      };
      const base13 = {
        cardNumber: 13,
        sport: 'football',
        year: '2020',
        manufacture: 'panini',
        setName: 'base set',
        quantity: 1,
        bin: 1,
      };
      const base17 = {
        cardNumber: 17,
        sport: 'football',
        year: '2020',
        manufacture: 'panini',
        setName: 'base set',
        quantity: 1,
        bin: 1,
      };

      //these should get filtered out
      const quantity0 = {
        cardNumber: 11,
        sport: 'football',
        year: '2020',
        manufacture: 'panini',
        setName: 'base set',
        title: 'base card 11',
        quantity: 0,
        bin: 1,
      };
      const bulk0 = {
        cardNumber: 15,
        sport: 'football',
        year: '2020',
        manufacture: 'panini',
        setName: 'base set',
        quantity: 0,
        bin: 1,
      };
      const fractionalQuantity = {
        cardNumber: 75,
        sport: 'football',
        year: '2020',
        manufacture: 'panini',
        setName: 'base set',
        quantity: 0.25,
        bin: 1,
      };
      const emptyStringQuantity = {
        cardNumber: 99,
        sport: 'football',
        year: '2020',
        manufacture: 'panini',
        setName: 'base set',
        quantity: '',
        bin: 1,
      };
      const allCards = {
        3: base3,
        11: quantity0,
        7: base7,
      };
      const bulk = [bulk0, base13, emptyStringQuantity, base17, fractionalQuantity];

      const result = await createGroups(allCards, bulk);

      expect(result).toContainAllKeys(['1']);

      expect(result['1']).toIncludeSameMembers([base3, base7, base13, base17]);
    });

    it('should include alpha and alpha numeric card numbers', async () => {
      const baseAlphaNumber = {
        cardNumber: 'D-7',
        sport: 'football',
        year: '2020',
        manufacture: 'panini',
        setName: 'base set',
        title: 'base card D-7',
        quantity: 1,
        bin: 1,
      };
      const bulkAlphaNumber = {
        cardNumber: 'RR-AD',
        sport: 'football',
        year: '2020',
        manufacture: 'panini',
        setName: 'base set',
        quantity: 1,
        bin: 1,
      };
      const allCards = {
        'D-7': baseAlphaNumber,
      };
      const bulk = [bulkAlphaNumber];

      const result = await createGroups(allCards, bulk);

      expect(result).toContainAllKeys(['1']);

      expect(result['1']).toIncludeSameMembers([bulkAlphaNumber, baseAlphaNumber]);
    });

    it('should exclude duplicates; preference on cards with pictures otherwise takes last', async () => {
      const allCards = {
        3: examples.base.card,
      };
      const bulk = [
        {
          cardNumber: 3,
          sport: 'football',
          year: '2020',
          manufacture: 'panini',
          setName: 'base set',
          title: 'Duplicate of base card 3',
          quantity: 1,
          bin: 1,
        },
        examples.base.another,
        {
          ...examples.base.another,
          quantity: 99,
          title: 'Duplicate of bulk card #7',
        },
      ];

      const result = await createGroups(allCards, bulk);

      expect(result).toContainAllKeys(['1']);

      expect(result['1']).toIncludeSameMembers([examples.base.card, examples.base.another]);
    });

    it('should trim a multi year to a single year (1981-82 should be 1981)',  async () => {
      const allCards = {
        3: {
          ...examples.base.card,
          year: '1980-81',
        },
      };
      const bulk = [
        {
          ...examples.base.another,
          year: '1980-81',
        },
      ];

      const result = await createGroups(allCards, bulk);

      expect(result).toContainAllKeys(['1']);
    });
  });
});
