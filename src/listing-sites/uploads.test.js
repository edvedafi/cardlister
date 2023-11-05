import { createGroups } from './uploads.js';

jest.mock('../utils/ask.js');
jest.mock('../utils/inputs.js');

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
    },
    another: {
      cardNumber: 7,
      sport: 'football',
      year: '2020',
      manufacture: 'panini',
      setName: 'base set',
      title: 'another base card',
      quantity: 1,
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
    },
  },
};

describe('uploads', () => {
  describe('createGroups', () => {
    it('should sort sll cards into each of the groups', () => {
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

      const result = createGroups(allCards, bulk);

      expect(result).toContainAllKeys([
        'football|2020|panini|base set||',
        'football|2020|panini|base set|insert set|',
        'football|2020|panini|base set|another insert set|',
        'football|2020|panini|base set||parallel set',
        'football|2020|panini|base set||shiny parallel set',
        'football|2020|panini|base set|insert set|parallel set',
        'football|2020|panini|base set|second insert set|parallel set',
        'football|2020|panini|base set|insert set|second parallel set',
        'football|2020|panini|base set|third insert set|third parallel set',
      ]);

      expect(result['football|2020|panini|base set||']).toIncludeSameMembers([
        examples.base.card,
        examples.base.another,
      ]);
      expect(result['football|2020|panini|base set|insert set|']).toIncludeSameMembers([examples.insert.card]);
      expect(result['football|2020|panini|base set|another insert set|']).toIncludeSameMembers([
        examples.insert.another,
      ]);
      expect(result['football|2020|panini|base set||parallel set']).toIncludeSameMembers([examples.parallel.card]);
      expect(result['football|2020|panini|base set||shiny parallel set']).toIncludeSameMembers([
        examples.parallel.shiny,
      ]);
      expect(result['football|2020|panini|base set|insert set|parallel set']).toIncludeSameMembers([
        examples.insert_parallel.card,
      ]);
      expect(result['football|2020|panini|base set|second insert set|parallel set']).toIncludeSameMembers([
        examples.insert_parallel.second_insert_same_parallel,
      ]);
      expect(result['football|2020|panini|base set|insert set|second parallel set']).toIncludeSameMembers([
        examples.insert_parallel.second_parallel_same_insert,
      ]);
      expect(result['football|2020|panini|base set|third insert set|third parallel set']).toIncludeSameMembers([
        examples.insert_parallel.third_insert_third_parallel,
      ]);
    });

    it('should generate the same result whether bulk or all cards', () => {
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

      const result = createGroups(allCards, bulk);

      expect(result).toContainAllKeys([
        'football|2020|panini|base set||',
        'football|2020|panini|base set|insert set|',
        'football|2020|panini|base set|another insert set|',
        'football|2020|panini|base set||parallel set',
        'football|2020|panini|base set||shiny parallel set',
        'football|2020|panini|base set|insert set|parallel set',
        'football|2020|panini|base set|second insert set|parallel set',
        'football|2020|panini|base set|insert set|second parallel set',
        'football|2020|panini|base set|third insert set|third parallel set',
      ]);

      expect(result['football|2020|panini|base set||']).toIncludeSameMembers([
        examples.base.card,
        examples.base.another,
      ]);
      expect(result['football|2020|panini|base set|insert set|']).toIncludeSameMembers([examples.insert.card]);
      expect(result['football|2020|panini|base set|another insert set|']).toIncludeSameMembers([
        examples.insert.another,
      ]);
      expect(result['football|2020|panini|base set||parallel set']).toIncludeSameMembers([examples.parallel.card]);
      expect(result['football|2020|panini|base set||shiny parallel set']).toIncludeSameMembers([
        examples.parallel.shiny,
      ]);
      expect(result['football|2020|panini|base set|insert set|parallel set']).toIncludeSameMembers([
        examples.insert_parallel.card,
      ]);
      expect(result['football|2020|panini|base set|second insert set|parallel set']).toIncludeSameMembers([
        examples.insert_parallel.second_insert_same_parallel,
      ]);
      expect(result['football|2020|panini|base set|insert set|second parallel set']).toIncludeSameMembers([
        examples.insert_parallel.second_parallel_same_insert,
      ]);
      expect(result['football|2020|panini|base set|third insert set|third parallel set']).toIncludeSameMembers([
        examples.insert_parallel.third_insert_third_parallel,
      ]);
    });

    it('should generate the same result when in both bulk or all cards', () => {
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

      const result = createGroups(allCards, bulk);

      expect(result).toContainAllKeys([
        'football|2020|panini|base set||',
        'football|2020|panini|base set|insert set|',
        'football|2020|panini|base set|another insert set|',
        'football|2020|panini|base set||parallel set',
        'football|2020|panini|base set||shiny parallel set',
        'football|2020|panini|base set|insert set|parallel set',
        'football|2020|panini|base set|second insert set|parallel set',
        'football|2020|panini|base set|insert set|second parallel set',
        'football|2020|panini|base set|third insert set|third parallel set',
      ]);

      expect(result['football|2020|panini|base set||']).toIncludeSameMembers([
        examples.base.card,
        examples.base.another,
      ]);
      expect(result['football|2020|panini|base set|insert set|']).toIncludeSameMembers([examples.insert.card]);
      expect(result['football|2020|panini|base set|another insert set|']).toIncludeSameMembers([
        examples.insert.another,
      ]);
      expect(result['football|2020|panini|base set||parallel set']).toIncludeSameMembers([examples.parallel.card]);
      expect(result['football|2020|panini|base set||shiny parallel set']).toIncludeSameMembers([
        examples.parallel.shiny,
      ]);
      expect(result['football|2020|panini|base set|insert set|parallel set']).toIncludeSameMembers([
        examples.insert_parallel.card,
      ]);
      expect(result['football|2020|panini|base set|second insert set|parallel set']).toIncludeSameMembers([
        examples.insert_parallel.second_insert_same_parallel,
      ]);
      expect(result['football|2020|panini|base set|insert set|second parallel set']).toIncludeSameMembers([
        examples.insert_parallel.second_parallel_same_insert,
      ]);
      expect(result['football|2020|panini|base set|third insert set|third parallel set']).toIncludeSameMembers([
        examples.insert_parallel.third_insert_third_parallel,
      ]);
    });

    it('should not include cards with a quantity of zero', () => {
      //build a few base cards to mix in
      const base3 = {
        cardNumber: 3,
        sport: 'football',
        year: '2020',
        manufacture: 'panini',
        setName: 'base set',
        title: 'base card 3',
        quantity: 2,
      };
      const base7 = {
        cardNumber: 7,
        sport: 'football',
        year: '2020',
        manufacture: 'panini',
        setName: 'base set',
        title: 'base card 7',
        quantity: 1,
      };
      const base13 = {
        cardNumber: 13,
        sport: 'football',
        year: '2020',
        manufacture: 'panini',
        setName: 'base set',
        quantity: 1,
      };
      const base17 = {
        cardNumber: 17,
        sport: 'football',
        year: '2020',
        manufacture: 'panini',
        setName: 'base set',
        quantity: 1,
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
      };
      const bulk0 = {
        cardNumber: 15,
        sport: 'football',
        year: '2020',
        manufacture: 'panini',
        setName: 'base set',
        quantity: 0,
      };
      const fractionalQuantity = {
        cardNumber: 75,
        sport: 'football',
        year: '2020',
        manufacture: 'panini',
        setName: 'base set',
        quantity: 0.25,
      };
      const emptyStringQuantity = {
        cardNumber: 99,
        sport: 'football',
        year: '2020',
        manufacture: 'panini',
        setName: 'base set',
        quantity: '',
      };
      const allCards = {
        3: base3,
        11: quantity0,
        7: base7,
      };
      const bulk = [bulk0, base13, emptyStringQuantity, base17, fractionalQuantity];

      const result = createGroups(allCards, bulk);

      expect(result).toContainAllKeys(['football|2020|panini|base set||']);

      expect(result['football|2020|panini|base set||']).toIncludeSameMembers([base3, base7, base13, base17]);
    });

    it('should include alpha and alpha numeric card numbers', () => {
      const baseAlphaNumber = {
        cardNumber: 'D-7',
        sport: 'football',
        year: '2020',
        manufacture: 'panini',
        setName: 'base set',
        title: 'base card D-7',
        quantity: 1,
      };
      const bulkAlphaNumber = {
        cardNumber: 'RR-AD',
        sport: 'football',
        year: '2020',
        manufacture: 'panini',
        setName: 'base set',
        quantity: 1,
      };
      const allCards = {
        'D-7': baseAlphaNumber,
      };
      const bulk = [bulkAlphaNumber];

      const result = createGroups(allCards, bulk);

      expect(result).toContainAllKeys(['football|2020|panini|base set||']);

      expect(result['football|2020|panini|base set||']).toIncludeSameMembers([bulkAlphaNumber, baseAlphaNumber]);
    });

    it('should exclude duplicates; preference on cards with pictures otherwise takes last', () => {
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
        },
        examples.base.another,
        {
          ...examples.base.another,
          quantity: 99,
          title: 'Duplicate of bulk card #7',
        },
      ];

      const result = createGroups(allCards, bulk);

      expect(result).toContainAllKeys(['football|2020|panini|base set||']);

      expect(result['football|2020|panini|base set||']).toIncludeSameMembers([
        examples.base.card,
        examples.base.another,
      ]);
    });
  });
});
