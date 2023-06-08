import {copyRightYearRegexMatch, runNLP} from './imageRecognition.js';
import * as ImageRecognition from "./imageRecognition.js";
import * as Teams from "../utils/teams.js";
import {ask} from "../utils/ask.js";

jest.mock('../utils/ask.js');

describe('Image Recognition', () => {

  beforeEach(() => {
    ask.mockReset();
    Teams.isTeam = jest.fn().mockImplementation((team) => {
      return team.toLowerCase().includes('cowboys');
    });
    ask.mockResolvedValue('enter');
  });

  afterEach(() => {
    ask.mockReset();
    Teams.isTeam.mockReset();
  });

  describe('copyRightYearRegexMatch', () => {
    it('should match "© 2021"', () => {
      expect(copyRightYearRegexMatch('© 2021')).toEqual('2021');
    });
    it('should match "©2021"', () => {
      expect(copyRightYearRegexMatch('©2021')).toEqual('2021');
    });
  });

  describe('runNLP', () => {
    it("should pick out the name that is most visible if there is more than one", async () => {
      const input = [
        {
          word: 'NFL',
          words: ['NFL'],
          confidence: 601.9931310415268,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'nfl'
        },
        {
          word: 'National Football League Players Association',
          words: ['National', 'Football', 'League', 'Players', 'Association'],
          confidence: 601.8303968906403,
          isFront: false,
          wordCount: 5,
          isNumber: false,
          lowerCase: 'national football league players association'
        },
        {
          word: 'COOPER KUPP',
          words: ['COOPER', 'KUPP'],
          wordCount: 2,
          confidence: 302.9736864566803,
          isFront: true,
          isNumber: false,
          lowerCase: 'cooper kupp'
        },
        {
          word: 'LOS ANGELES RAMS',
          words: ['LOS', 'ANGELES', 'RAMS'],
          wordCount: 3,
          confidence: 302.9736864566803,
          isFront: true,
          isNumber: false,
          lowerCase: 'los angeles rams'
        },
        {
          word: 'LA',
          words: ['LA'],
          wordCount: 1,
          confidence: 302.9729171991348,
          isFront: true,
          isNumber: false,
          lowerCase: 'la'
        },
        {
          word: 'NE',
          words: ['NE'],
          wordCount: 1,
          confidence: 302.8218778371811,
          isFront: true,
          isNumber: false,
          lowerCase: 'ne'
        },
        {
          word: 'ia',
          words: ['ia'],
          wordCount: 1,
          confidence: 302.51606088876724,
          isFront: true,
          isNumber: false,
          lowerCase: 'ia'
        },
        {
          word: 'TI',
          words: ['TI'],
          wordCount: 1,
          confidence: 302.3264780640602,
          isFront: true,
          isNumber: false,
          lowerCase: 'ti'
        },
        {
          word: "It's a sight that NFL defenses saw time and time again during Kupp's incredible 2021 season . Nary a game went by in which the Pro Bowl wideout didn't flash his talent . for spectacular catches , showing total body control to fly high to snag a laser beam from Matthew Stafford while staying in bounds .",
          words: [
            "It's", 'a', 'sight', 'that',
            'NFL', 'defenses', 'saw', 'time',
            'and', 'time', 'again', 'during',
            "Kupp's", 'incredible', '2021', 'season',
            '.', 'Nary', 'a', 'game',
            'went', 'by', 'in', 'which',
            'the', 'Pro', 'Bowl', 'wideout',
            "didn't", 'flash', 'his', 'talent',
            '.', 'for', 'spectacular', 'catches',
            ',', 'showing', 'total', 'body',
            'control', 'to', 'fly', 'high',
            'to', 'snag', 'a', 'laser',
            'beam', 'from', 'Matthew', 'Stafford',
            'while', 'staying', 'in', 'bounds',
            '.'
          ],
          wordCount: 57,
          confidence: 301.98616337776184,
          isFront: false,
          isNumber: false,
          lowerCase: "it's a sight that nfl defenses saw time and time again during kupp's incredible 2021 season . nary a game went by in which the pro bowl wideout didn't flash his talent . for spectacular catches , showing total body control to fly high to snag a laser beam from matthew stafford while staying in bounds ."
        },
        {
          word: 'LOS ANGELES RAMS COOPER KUPP',
          words: ['LOS', 'ANGELES', 'RAMS', 'COOPER', 'KUPP'],
          wordCount: 5,
          confidence: 301.9736986756325,
          isFront: false,
          isNumber: false,
          lowerCase: 'los angeles rams cooper kupp'
        },
        {
          word: '2022 PANINI - SCORE FOOTBALL',
          words: ['2022', 'PANINI', '-', 'SCORE', 'FOOTBALL'],
          wordCount: 5,
          confidence: 301.9584296941757,
          isFront: false,
          isNumber: false,
          lowerCase: '2022 panini - score football'
        },
        {
          word: '© 2022 Panini America , Inc. Produced in the USA .',
          words: [
            '©', '2022',
            'Panini', 'America',
            ',', 'Inc.',
            'Produced', 'in',
            'the', 'USA',
            '.'
          ],
          wordCount: 11,
          confidence: 301.9584296941757,
          isFront: false,
          isNumber: false,
          lowerCase: '© 2022 panini america , inc. produced in the usa .'
        },
        {
          word: 'TOE THE',
          words: ['TOE', 'THE'],
          wordCount: 2,
          confidence: 301.95231479406357,
          isFront: false,
          isNumber: false,
          lowerCase: 'toe the'
        },
        {
          word: 'LINE LA',
          words: ['LINE', 'LA'],
          wordCount: 2,
          confidence: 301.95231479406357,
          isFront: false,
          isNumber: false,
          lowerCase: 'line la'
        },
        {
          word: 'PANINI',
          words: ['PANINI'],
          wordCount: 1,
          confidence: 301.9043103456497,
          isFront: false,
          isNumber: false,
          lowerCase: 'panini'
        },
        {
          word: 'No. TL - CK',
          words: ['No.', 'TL', '-', 'CK'],
          wordCount: 4,
          confidence: 301.9038890004158,
          isFront: false,
          isNumber: false,
          lowerCase: 'no. tl - ck'
        },
        {
          word: 'NFL NFLPA',
          words: ['NFL', 'NFLPA'],
          wordCount: 2,
          confidence: 301.9017153978348,
          isFront: false,
          isNumber: false,
          lowerCase: 'nfl nflpa'
        },
        {
          word: 'Sports uniform',
          words: ['Sports', 'uniform'],
          confidence: 102.95498466491699,
          isFront: true,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'sports uniform'
        },
        {
          word: 'Helmet',
          words: ['Helmet'],
          confidence: 102.94659692049026,
          isFront: true,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'helmet'
        },
        {
          word: 'Sports equipment',
          words: ['Sports', 'equipment'],
          confidence: 102.92398184537888,
          isFront: true,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'sports equipment'
        },
        {
          word: 'Sports gear',
          words: ['Sports', 'gear'],
          confidence: 102.89503699541092,
          isFront: true,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'sports gear'
        },
        {
          word: 'Football helmet',
          words: ['Football', 'helmet'],
          confidence: 102.89462214708328,
          isFront: true,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'football helmet'
        },
        {
          word: 'American football',
          words: ['American', 'football'],
          confidence: 102.8643050789833,
          isFront: true,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'american football'
        },
        {
          word: 'Football equipment',
          words: ['Football', 'equipment'],
          confidence: 102.86345726251602,
          isFront: true,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'football equipment'
        },
        {
          word: 'Jersey',
          words: ['Jersey'],
          confidence: 102.85510522127151,
          isFront: true,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'jersey'
        },
        {
          word: 'Gesture',
          words: ['Gesture'],
          confidence: 102.85260486602783,
          isFront: true,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'gesture'
        },
        {
          word: 'Art',
          words: ['Art'],
          confidence: 102.82416540384293,
          isFront: true,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'art'
        },
        {
          word: 'Font',
          words: ['Font'],
          confidence: 101.81113016605377,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'font'
        },
        {
          word: 'Flag',
          words: ['Flag'],
          confidence: 101.78671109676361,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'flag'
        },
        {
          word: 'Technology',
          words: ['Technology'],
          confidence: 101.76370924711227,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'technology'
        },
        {
          word: 'Rectangle',
          words: ['Rectangle'],
          confidence: 101.75886511802673,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'rectangle'
        },
        {
          word: 'Poster',
          words: ['Poster'],
          confidence: 101.70774108171463,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'poster'
        },
        {
          word: 'Screenshot',
          words: ['Screenshot'],
          confidence: 101.68597197532654,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'screenshot'
        },
        {
          word: 'Advertising',
          words: ['Advertising'],
          confidence: 101.67463541030884,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'advertising'
        },
        {
          word: 'Electric blue',
          words: ['Electric', 'blue'],
          confidence: 101.66857033967972,
          isFront: false,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'electric blue'
        },
        {
          word: 'Logo',
          words: ['Logo'],
          confidence: 101.66444432735443,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'logo'
        },
        {
          word: 'Graphics',
          words: ['Graphics'],
          confidence: 101.66381579637527,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'graphics'
        }
      ];
      const nlpResponse = [
        {
          entity_group: 'PER',
          score: 0.9531968235969543,
          word: 'cooper kupp',
          start: 51,
          end: 62
        },
        {
          entity_group: 'PER',
          score: 0.9738671779632568,
          word: 'kupp',
          start: 160,
          end: 164
        },
        {
          entity_group: 'PER',
          score: 0.997492790222168,
          word: 'matthew stafford',
          start: 359,
          end: 375
        },
        {
          entity_group: 'PER',
          score: 0.9291067123413086,
          word: 'cooper ku',
          start: 420,
          end: 429
        }
      ]
      ImageRecognition.callNLP = jest.fn().mockResolvedValue(nlpResponse);
      ask.mockResolvedValue('enter');
      const expected = {
        player: 'Cooper Kupp'
      };
      expect(await runNLP(input)).toEqual(expected);
    });

    it("should pick out an initialed name from the text", async () => {
      const input = [
        {
          word: 'AFC South',
          words: ['AFC', 'South'],
          confidence: 602.8956855535507,
          isFront: true,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'afc south'
        },
        {
          word: 'NFL',
          words: ['NFL'],
          confidence: 601.9913439750671,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'nfl'
        },
        {
          word: 'AFC South',
          words: ['AFC', 'South'],
          confidence: 601.9222584962845,
          isFront: false,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'afc south'
        },
        {
          word: 'National Football League Players Association',
          words: ['National', 'Football', 'League', 'Players', 'Association'],
          confidence: 601.8639717102051,
          isFront: false,
          wordCount: 5,
          isNumber: false,
          lowerCase: 'national football league players association'
        },
        {
          word: 'T',
          words: ['T'],
          wordCount: 1,
          confidence: 302.95366072654724,
          isFront: true,
          isNumber: false,
          lowerCase: 't'
        },
        {
          word: 'B',
          words: ['B'],
          wordCount: 1,
          confidence: 302.94785463809967,
          isFront: true,
          isNumber: false,
          lowerCase: 'b'
        },
        {
          word: 'A.J. BROWN',
          words: ['A.J.', 'BROWN'],
          wordCount: 2,
          confidence: 302.93459594249725,
          isFront: true,
          isNumber: false,
          lowerCase: 'a.j. brown'
        },
        {
          word: 'TENNESSEE TITANS',
          words: ['TENNESSEE', 'TITANS'],
          wordCount: 2,
          confidence: 302.93459594249725,
          isFront: true,
          isNumber: false,
          lowerCase: 'tennessee titans'
        },
        {
          word: 'BROWN',
          words: ['BROWN'],
          wordCount: 1,
          confidence: 302.90155750513077,
          isFront: true,
          isNumber: false,
          lowerCase: 'brown'
        },
        {
          word: 'SCORE',
          words: ['SCORE'],
          wordCount: 1,
          confidence: 302.88939237594604,
          isFront: true,
          isNumber: false,
          lowerCase: 'score'
        },
        {
          word: 'T',
          words: ['T'],
          wordCount: 1,
          confidence: 302.50026470422745,
          isFront: true,
          isNumber: false,
          lowerCase: 't'
        },
        {
          word: '" |||||',
          words: ['"', '|||||'],
          wordCount: 2,
          confidence: 302.46104258298874,
          isFront: true,
          isNumber: false,
          lowerCase: '" |||||'
        },
        {
          word: "Big and strong , Brown can be a nightmare in single coverage . When he goes airborne , he's virtually unstoppable . Using his size and strength to box out a cornerback , the Pro Bowl wideout finishes the play off by using his glue - like hands to snag the ball and taps his toes in bounds for the catch .",
          words: [
            'Big', 'and', 'strong', ',',
            'Brown', 'can', 'be', 'a',
            'nightmare', 'in', 'single', 'coverage',
            '.', 'When', 'he', 'goes',
            'airborne', ',', "he's", 'virtually',
            'unstoppable', '.', 'Using', 'his',
            'size', 'and', 'strength', 'to',
            'box', 'out', 'a', 'cornerback',
            ',', 'the', 'Pro', 'Bowl',
            'wideout', 'finishes', 'the', 'play',
            'off', 'by', 'using', 'his',
            'glue', '-', 'like', 'hands',
            'to', 'snag', 'the', 'ball',
            'and', 'taps', 'his', 'toes',
            'in', 'bounds', 'for', 'the',
            'catch', '.'
          ],
          wordCount: 62,
          confidence: 301.9887323975563,
          isFront: false,
          isNumber: false,
          lowerCase: "big and strong , brown can be a nightmare in single coverage . when he goes airborne , he's virtually unstoppable . using his size and strength to box out a cornerback , the pro bowl wideout finishes the play off by using his glue - like hands to snag the ball and taps his toes in bounds for the catch ."
        },
        {
          word: 'No. TL - AB',
          words: ['No.', 'TL', '-', 'AB'],
          wordCount: 4,
          confidence: 301.9762284755707,
          isFront: false,
          isNumber: false,
          lowerCase: 'no. tl - ab'
        },
        {
          word: 'TOE THE',
          words: ['TOE', 'THE'],
          wordCount: 2,
          confidence: 301.9552029967308,
          isFront: false,
          isNumber: false,
          lowerCase: 'toe the'
        },
        {
          word: 'LINE',
          words: ['LINE'],
          wordCount: 1,
          confidence: 301.9552029967308,
          isFront: false,
          isNumber: false,
          lowerCase: 'line'
        },
        {
          word: '2022 PANINI - SCORE FOOTBALL',
          words: ['2022', 'PANINI', '-', 'SCORE', 'FOOTBALL'],
          wordCount: 5,
          confidence: 301.9451759457588,
          isFront: false,
          isNumber: false,
          lowerCase: '2022 panini - score football'
        },
        {
          word: '© 2022 Panini America , Inc. Produced in the USA .',
          words: [
            '©', '2022',
            'Panini', 'America',
            ',', 'Inc.',
            'Produced', 'in',
            'the', 'USA',
            '.'
          ],
          wordCount: 11,
          confidence: 301.9451759457588,
          isFront: false,
          isNumber: false,
          lowerCase: '© 2022 panini america , inc. produced in the usa .'
        },
        {
          word: 'T',
          words: ['T'],
          wordCount: 1,
          confidence: 301.93348932266235,
          isFront: false,
          isNumber: false,
          lowerCase: 't'
        },
        {
          word: 'TENNESSEE TITANS A.J. BROWN',
          words: ['TENNESSEE', 'TITANS', 'A.J.', 'BROWN'],
          wordCount: 4,
          confidence: 301.93348932266235,
          isFront: false,
          isNumber: false,
          lowerCase: 'tennessee titans a.j. brown'
        },
        {
          word: 'NFL NFLPA',
          words: ['NFL', 'NFLPA'],
          wordCount: 2,
          confidence: 301.8967739343643,
          isFront: false,
          isNumber: false,
          lowerCase: 'nfl nflpa'
        },
        {
          word: 'PANINI',
          words: ['PANINI'],
          wordCount: 1,
          confidence: 301.88855481147766,
          isFront: false,
          isNumber: false,
          lowerCase: 'panini'
        },
        {
          word: 'Sports uniform',
          words: ['Sports', 'uniform'],
          confidence: 102.93370020389557,
          isFront: true,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'sports uniform'
        },
        {
          word: 'Helmet',
          words: ['Helmet'],
          confidence: 102.93233454227448,
          isFront: true,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'helmet'
        },
        {
          word: 'Jersey',
          words: ['Jersey'],
          confidence: 102.87926077842712,
          isFront: true,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'jersey'
        },
        {
          word: 'Sports equipment',
          words: ['Sports', 'equipment'],
          confidence: 102.85584634542465,
          isFront: true,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'sports equipment'
        },
        {
          word: 'Sports gear',
          words: ['Sports', 'gear'],
          confidence: 102.84592252969742,
          isFront: true,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'sports gear'
        },
        {
          word: 'Player',
          words: ['Player'],
          confidence: 102.81925481557846,
          isFront: true,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'player'
        },
        {
          word: 'Font',
          words: ['Font'],
          confidence: 102.7979012131691,
          isFront: true,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'font'
        },
        {
          word: 'Super bowl',
          words: ['Super', 'bowl'],
          confidence: 102.74057126045227,
          isFront: true,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'super bowl'
        },
        {
          word: 'Technology',
          words: ['Technology'],
          confidence: 102.73786568641663,
          isFront: true,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'technology'
        },
        {
          word: 'Sports',
          words: ['Sports'],
          confidence: 102.71593415737152,
          isFront: true,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'sports'
        },
        {
          word: 'Font',
          words: ['Font'],
          confidence: 101.81748592853546,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'font'
        },
        {
          word: 'Rectangle',
          words: ['Rectangle'],
          confidence: 101.79077911376953,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'rectangle'
        },
        {
          word: 'Technology',
          words: ['Technology'],
          confidence: 101.73790299892426,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'technology'
        },
        {
          word: 'Poster',
          words: ['Poster'],
          confidence: 101.73429733514786,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'poster'
        },
        {
          word: 'Advertising',
          words: ['Advertising'],
          confidence: 101.68727558851242,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'advertising'
        },
        {
          word: 'Electric blue',
          words: ['Electric', 'blue'],
          confidence: 101.68539494276047,
          isFront: false,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'electric blue'
        },
        {
          word: 'Logo',
          words: ['Logo'],
          confidence: 101.61256337165833,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'logo'
        },
        {
          word: 'Publication',
          words: ['Publication'],
          confidence: 101.59755301475525,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'publication'
        },
        {
          word: 'Flag',
          words: ['Flag'],
          confidence: 101.59483402967453,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'flag'
        },
        {
          word: 'History',
          words: ['History'],
          confidence: 101.58473545312881,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'history'
        }
      ]
      ImageRecognition.callNLP = jest.fn().mockResolvedValue([
        {
          entity_group: 'PER',
          score: 0.6013481020927429,
          word: 'a',
          start: 79,
          end: 80
        },
        {
          entity_group: 'PER',
          score: 0.9269266128540039,
          word: 'j',
          start: 81,
          end: 82
        },
        {
          entity_group: 'PER',
          score: 0.9597631096839905,
          word: 'brown',
          start: 84,
          end: 89
        },
        {
          entity_group: 'PER',
          score: 0.9601618647575378,
          word: 'brown',
          start: 152,
          end: 157
        },
        {
          entity_group: 'PER',
          score: 0.4763093590736389,
          word: 'j',
          start: 573,
          end: 574
        },
        {
          entity_group: 'PER',
          score: 0.9570426344871521,
          word: 'brown',
          start: 576,
          end: 581
        }
      ]);
      ask.mockResolvedValue('enter');
      expect(await runNLP(input)).toEqual({
        player: 'A.J. Brown'
      });
    });

    it("should pick not return symbols", async () => {
      const input = [
        {
          word: 'Dallas Cowboys',
          words: ['Dallas', 'Cowboys'],
          confidence: 602.9572708010674,
          isFront: true,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'dallas cowboys'
        },
        {
          word: 'NFL',
          words: ['NFL'],
          confidence: 601.9919034838676,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'nfl'
        },
        {
          word: 'Dallas Cowboys',
          words: ['Dallas', 'Cowboys'],
          confidence: 601.9541841745377,
          isFront: false,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'dallas cowboys'
        },
        {
          word: 'National Football League Players Association',
          words: ['National', 'Football', 'League', 'Players', 'Association'],
          confidence: 601.8660658597946,
          isFront: false,
          wordCount: 5,
          isNumber: false,
          lowerCase: 'national football league players association'
        },
        {
          word: 'CEEDEE LAMB',
          words: ['CEEDEE', 'LAMB'],
          wordCount: 2,
          confidence: 302.94359439611435,
          isFront: true,
          isNumber: false,
          lowerCase: 'ceedee lamb'
        },
        {
          word: 'DALLAS COWBOYS',
          words: ['DALLAS', 'COWBOYS'],
          wordCount: 2,
          confidence: 302.94359439611435,
          isFront: true,
          isNumber: false,
          lowerCase: 'dallas cowboys'
        },
        {
          word: 'SCORE',
          words: ['SCORE'],
          wordCount: 1,
          confidence: 302.9196665883064,
          isFront: true,
          isNumber: false,
          lowerCase: 'score'
        },
        {
          word: 'SIZAX',
          words: ['SIZAX'],
          wordCount: 1,
          confidence: 302.4688068330288,
          isFront: true,
          isNumber: false,
          lowerCase: 'sizax'
        },
        {
          word: '69',
          words: ['69'],
          wordCount: 1,
          confidence: 302.4535794854164,
          isFront: true,
          isNumber: true,
          lowerCase: '69'
        },
        {
          word: "You've heard of bird watching ? In Dallas , fans prefer to spend their time Lamb watching . Grabbing their binoculars , they keep them focused on the skies above the field , where they're likely to spot their favorite high - flying receiver taking to the air to haul in a pass from Dak Prescott .",
          words: [
            "You've", 'heard', 'of', 'bird',
            'watching', '?', 'In', 'Dallas',
            ',', 'fans', 'prefer', 'to',
            'spend', 'their', 'time', 'Lamb',
            'watching', '.', 'Grabbing', 'their',
            'binoculars', ',', 'they', 'keep',
            'them', 'focused', 'on', 'the',
            'skies', 'above', 'the', 'field',
            ',', 'where', "they're", 'likely',
            'to', 'spot', 'their', 'favorite',
            'high', '-', 'flying', 'receiver',
            'taking', 'to', 'the', 'air',
            'to', 'haul', 'in', 'a',
            'pass', 'from', 'Dak', 'Prescott',
            '.'
          ],
          wordCount: 57,
          confidence: 301.990605533123,
          isFront: false,
          isNumber: false,
          lowerCase: "you've heard of bird watching ? in dallas , fans prefer to spend their time lamb watching . grabbing their binoculars , they keep them focused on the skies above the field , where they're likely to spot their favorite high - flying receiver taking to the air to haul in a pass from dak prescott ."
        },
        {
          word: 'TOE THE',
          words: ['TOE', 'THE'],
          wordCount: 2,
          confidence: 301.94999861717224,
          isFront: false,
          isNumber: false,
          lowerCase: 'toe the'
        },
        {
          word: 'LINE',
          words: ['LINE'],
          wordCount: 1,
          confidence: 301.94999861717224,
          isFront: false,
          isNumber: false,
          lowerCase: 'line'
        },
        {
          word: 'DALLAS COWBOYS',
          words: ['DALLAS', 'COWBOYS'],
          wordCount: 2,
          confidence: 301.9452558159828,
          isFront: false,
          isNumber: false,
          lowerCase: 'dallas cowboys'
        },
        {
          word: 'CEEDEE LAMB',
          words: ['CEEDEE', 'LAMB'],
          wordCount: 2,
          confidence: 301.9452558159828,
          isFront: false,
          isNumber: false,
          lowerCase: 'ceedee lamb'
        },
        {
          word: '2022 PANINI - SCORE FOOTBALL',
          words: ['2022', 'PANINI', '-', 'SCORE', 'FOOTBALL'],
          wordCount: 5,
          confidence: 301.93136817216873,
          isFront: false,
          isNumber: false,
          lowerCase: '2022 panini - score football'
        },
        {
          word: 'BRO 2022 Panini America , Inc. Produced in the USA .',
          words: [
            'BRO', '2022',
            'Panini', 'America',
            ',', 'Inc.',
            'Produced', 'in',
            'the', 'USA',
            '.'
          ],
          wordCount: 11,
          confidence: 301.93136817216873,
          isFront: false,
          isNumber: false,
          lowerCase: 'bro 2022 panini america , inc. produced in the usa .'
        },
        {
          word: 'NFL NFLPA',
          words: ['NFL', 'NFLPA'],
          wordCount: 2,
          confidence: 301.9231276512146,
          isFront: false,
          isNumber: false,
          lowerCase: 'nfl nflpa'
        },
        {
          word: 'PANINI',
          words: ['PANINI'],
          wordCount: 1,
          confidence: 301.89966148138046,
          isFront: false,
          isNumber: false,
          lowerCase: 'panini'
        },
        {
          word: 'No. TL - CL',
          words: ['No.', 'TL', '-', 'CL'],
          wordCount: 4,
          confidence: 301.7919667363167,
          isFront: false,
          isNumber: false,
          lowerCase: 'no. tl - cl'
        },
        {
          word: 'Sports uniform',
          words: ['Sports', 'uniform'],
          confidence: 102.94856584072113,
          isFront: true,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'sports uniform'
        },
        {
          word: 'Sports equipment',
          words: ['Sports', 'equipment'],
          confidence: 102.92535084486008,
          isFront: true,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'sports equipment'
        },
        {
          word: 'World',
          words: ['World'],
          confidence: 102.91424202919006,
          isFront: true,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'world'
        },
        {
          word: 'Sports jersey',
          words: ['Sports', 'jersey'],
          confidence: 102.91017735004425,
          isFront: true,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'sports jersey'
        },
        {
          word: 'Jersey',
          words: ['Jersey'],
          confidence: 102.9033271074295,
          isFront: true,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'jersey'
        },
        {
          word: 'Rectangle',
          words: ['Rectangle'],
          confidence: 102.83790963888168,
          isFront: true,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'rectangle'
        },
        {
          word: 'Football',
          words: ['Football'],
          confidence: 102.82323795557022,
          isFront: true,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'football'
        },
        {
          word: 'Player',
          words: ['Player'],
          confidence: 102.81774318218231,
          isFront: true,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'player'
        },
        {
          word: 'Font',
          words: ['Font'],
          confidence: 102.80517810583115,
          isFront: true,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'font'
        },
        {
          word: 'Sports gear',
          words: ['Sports', 'gear'],
          confidence: 102.79227083921432,
          isFront: true,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'sports gear'
        },
        {
          word: 'Font',
          words: ['Font'],
          confidence: 101.83244633674622,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'font'
        },
        {
          word: 'Flag',
          words: ['Flag'],
          confidence: 101.79131799936295,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'flag'
        },
        {
          word: 'Poster',
          words: ['Poster'],
          confidence: 101.7352220416069,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'poster'
        },
        {
          word: 'Electric blue',
          words: ['Electric', 'blue'],
          confidence: 101.72731131315231,
          isFront: false,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'electric blue'
        },
        {
          word: 'Rectangle',
          words: ['Rectangle'],
          confidence: 101.72135108709335,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'rectangle'
        },
        {
          word: 'Symmetry',
          words: ['Symmetry'],
          confidence: 101.71000224351883,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'symmetry'
        },
        {
          word: 'Symbol',
          words: ['Symbol'],
          confidence: 101.6992279291153,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'symbol'
        },
        {
          word: 'Logo',
          words: ['Logo'],
          confidence: 101.68830955028534,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'logo'
        },
        {
          word: 'Graphics',
          words: ['Graphics'],
          confidence: 101.65953302383423,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'graphics'
        },
        {
          word: 'Graphic design',
          words: ['Graphic', 'design'],
          confidence: 101.6055200099945,
          isFront: false,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'graphic design'
        }
      ]
      ImageRecognition.callNLP = jest.fn().mockResolvedValue([
        {
          entity_group: 'PER',
          score: 0.9931560158729553,
          word: 'ce',
          start: 83,
          end: 85
        },
        {
          entity_group: 'PER',
          score: 0.9872638583183289,
          word: '##ede',
          start: 85,
          end: 88
        },
        {
          entity_group: 'PER',
          score: 0.9907485246658325,
          word: '##e lamb',
          start: 88,
          end: 94
        },
        {
          entity_group: 'PER',
          score: 0.9967606663703918,
          word: 'da',
          start: 412,
          end: 414
        },
        {
          entity_group: 'PER',
          score: 0.9964299201965332,
          word: '##k prescott',
          start: 414,
          end: 424
        },
        {
          entity_group: 'PER',
          score: 0.9863378405570984,
          word: 'ce',
          start: 459,
          end: 461
        },
        {
          entity_group: 'PER',
          score: 0.9325144290924072,
          word: '##ede',
          start: 461,
          end: 464
        },
        {
          entity_group: 'PER',
          score: 0.992206871509552,
          word: '##e lamb',
          start: 464,
          end: 470
        }
      ]);
      Teams.isTeam = jest.fn().mockImplementation((team) => {
        return team.toLowerCase().includes('cowboys');
      });
      ask.mockResolvedValue('enter');
      expect(await runNLP(input)).toEqual({
        //I know this should be CeeDee but right now have no idea how to know that would be the correct spelling
        player: 'Ceedee Lamb',
      });
    });

    it("should find a name with an ' in it", async () => {
      const input = [
        {
          word: 'New York Giants',
          words: ['New', 'York', 'Giants'],
          confidence: 602.9855198860168,
          isFront: true,
          wordCount: 3,
          isNumber: false,
          lowerCase: 'new york giants'
        },
        {
          word: 'Sulzer',
          words: ['Sulzer'],
          confidence: 602.6196897625923,
          isFront: true,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'sulzer'
        },
        {
          word: 'NFL',
          words: ['NFL'],
          confidence: 601.9937907457352,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'nfl'
        },
        {
          word: 'New York Giants',
          words: ['New', 'York', 'Giants'],
          confidence: 601.9619786143303,
          isFront: false,
          wordCount: 3,
          isNumber: false,
          lowerCase: 'new york giants'
        },
        {
          word: 'National Football League Players Association',
          words: ['National', 'Football', 'League', 'Players', 'Association'],
          confidence: 601.8484349250793,
          isFront: false,
          wordCount: 5,
          isNumber: false,
          lowerCase: 'national football league players association'
        },
        {
          word: 'QB',
          words: ['QB'],
          wordCount: 1,
          confidence: 302.9890368580818,
          isFront: true,
          isNumber: false,
          lowerCase: 'qb'
        },
        {
          word: '8',
          words: ['8'],
          wordCount: 1,
          confidence: 302.9832860827446,
          isFront: true,
          isNumber: true,
          lowerCase: '8'
        },
        {
          word: 'SCORECARD SCORECARD SCORECARD SCORECARD',
          words: ['SCORECARD', 'SCORECARD', 'SCORECARD', 'SCORECARD'],
          wordCount: 4,
          confidence: 302.96492075920105,
          isFront: true,
          isNumber: false,
          lowerCase: 'scorecard scorecard scorecard scorecard'
        },
        {
          word: 'SCORECARD SCORECARD SCORECARD SCORECARD',
          words: ['SCORECARD', 'SCORECARD', 'SCORECARD', 'SCORECARD'],
          wordCount: 4,
          confidence: 302.95703107118607,
          isFront: true,
          isNumber: false,
          lowerCase: 'scorecard scorecard scorecard scorecard'
        },
        {
          word: 'hu',
          words: ['hu'],
          wordCount: 1,
          confidence: 302.94037115573883,
          isFront: true,
          isNumber: false,
          lowerCase: 'hu'
        },
        {
          word: 'DANIEL JONES',
          words: ['DANIEL', 'JONES'],
          wordCount: 2,
          confidence: 302.9228679537773,
          isFront: true,
          isNumber: false,
          lowerCase: 'daniel jones'
        },
        {
          word: 'SCORE',
          words: ['SCORE'],
          wordCount: 1,
          confidence: 302.91339963674545,
          isFront: true,
          isNumber: false,
          lowerCase: 'score'
        },
        {
          word: 'DANIEL JONES',
          words: ['DANIEL', 'JONES'],
          wordCount: 2,
          confidence: 301.986486017704,
          isFront: false,
          isNumber: false,
          lowerCase: 'daniel jones'
        },
        {
          word: "Y.A. Tittle was the first Giants player to record at least 400 passing yards in a game , throwing for 505 in 1962. Three players have joined him on that list since : Phil Simms , Eli Manning and Jones . New York's current QB accomplished it for the first time with a 402 - yard day vs. New Orleans in Week 4 of 2021 .",
          words: [
            'Y.A.', 'Tittle', 'was', 'the',
            'first', 'Giants', 'player', 'to',
            'record', 'at', 'least', '400',
            'passing', 'yards', 'in', 'a',
            'game', ',', 'throwing', 'for',
            '505', 'in', '1962.', 'Three',
            'players', 'have', 'joined', 'him',
            'on', 'that', 'list', 'since',
            ':', 'Phil', 'Simms', ',',
            'Eli', 'Manning', 'and', 'Jones',
            '.', 'New', "York's", 'current',
            'QB', 'accomplished', 'it', 'for',
            'the', 'first', 'time', 'with',
            'a', '402', '-', 'yard',
            'day', 'vs.', 'New', 'Orleans',
            'in', 'Week', '4', 'of',
            '2021', '.'
          ],
          wordCount: 66,
          confidence: 301.986486017704,
          isFront: false,
          isNumber: false,
          lowerCase: "y.a. tittle was the first giants player to record at least 400 passing yards in a game , throwing for 505 in 1962. three players have joined him on that list since : phil simms , eli manning and jones . new york's current qb accomplished it for the first time with a 402 - yard day vs. new orleans in week 4 of 2021 ."
        },
        {
          word: 'RATE ATT YDS TD',
          words: ['RATE', 'ATT', 'YDS', 'TD'],
          wordCount: 4,
          confidence: 301.9776403307915,
          isFront: false,
          isNumber: false,
          lowerCase: 'rate att yds td'
        },
        {
          word: '62 298 2 5',
          words: ['62', '298', '2', '5'],
          wordCount: 4,
          confidence: 301.9776403307915,
          isFront: false,
          isNumber: false,
          lowerCase: '62 298 2 5'
        },
        {
          word: '172 1000',
          words: ['172', '1000'],
          wordCount: 2,
          confidence: 301.9776403307915,
          isFront: false,
          isNumber: false,
          lowerCase: '172 1000'
        },
        {
          word: 'No. 234',
          words: ['No.', '234'],
          wordCount: 2,
          confidence: 301.97200459241867,
          isFront: false,
          isNumber: false,
          lowerCase: 'no. 234'
        },
        {
          word: '2022 PANINI - SCORE FOOTBALL',
          words: ['2022', 'PANINI', '-', 'SCORE', 'FOOTBALL'],
          wordCount: 5,
          confidence: 301.9647750854492,
          isFront: false,
          isNumber: false,
          lowerCase: '2022 panini - score football'
        },
        {
          word: '2022 Panini America , Inc. Produced in the USA .',
          words: [
            '2022', 'Panini',
            'America', ',',
            'Inc.', 'Produced',
            'in', 'the',
            'USA', '.'
          ],
          wordCount: 10,
          confidence: 301.9647750854492,
          isFront: false,
          isNumber: false,
          lowerCase: '2022 panini america , inc. produced in the usa .'
        },
        {
          word: 'CMP ATT CMP % YDS',
          words: ['CMP', 'ATT', 'CMP', '%', 'YDS'],
          wordCount: 5,
          confidence: 301.95861607789993,
          isFront: false,
          isNumber: false,
          lowerCase: 'cmp att cmp % yds'
        },
        {
          word: '64.3 2428 361 232 NFL TOTALS 796 1268 62.8 8398',
          words: [
            '64.3', '2428',
            '361', '232',
            'NFL', 'TOTALS',
            '796', '1268',
            '62.8', '8398'
          ],
          wordCount: 10,
          confidence: 301.95861607789993,
          isFront: false,
          isNumber: false,
          lowerCase: '64.3 2428 361 232 nfl totals 796 1268 62.8 8398'
        },
        {
          word: 'YEAR TEAM 2021 GIANTS',
          words: ['YEAR', 'TEAM', '2021', 'GIANTS'],
          wordCount: 4,
          confidence: 301.95694476366043,
          isFront: false,
          isNumber: false,
          lowerCase: 'year team 2021 giants'
        },
        {
          word: 'INT',
          words: ['INT'],
          wordCount: 1,
          confidence: 301.95673727989197,
          isFront: false,
          isNumber: false,
          lowerCase: 'int'
        },
        {
          word: '84.8 7 29 84.3',
          words: ['84.8', '7', '29', '84.3'],
          wordCount: 4,
          confidence: 301.95673727989197,
          isFront: false,
          isNumber: false,
          lowerCase: '84.8 7 29 84.3'
        },
        {
          word: 'TD',
          words: ['TD'],
          wordCount: 1,
          confidence: 301.9513276219368,
          isFront: false,
          isNumber: false,
          lowerCase: 'td'
        },
        {
          word: '10',
          words: ['10'],
          wordCount: 1,
          confidence: 301.9513276219368,
          isFront: false,
          isNumber: true,
          lowerCase: '10'
        },
        {
          word: '45',
          words: ['45'],
          wordCount: 1,
          confidence: 301.9513276219368,
          isFront: false,
          isNumber: true,
          lowerCase: '45'
        },
        {
          word: 'NFL NFLPA',
          words: ['NFL', 'NFLPA'],
          wordCount: 2,
          confidence: 301.90930676460266,
          isFront: false,
          isNumber: false,
          lowerCase: 'nfl nflpa'
        },
        {
          word: 'PANINI',
          words: ['PANINI'],
          wordCount: 1,
          confidence: 301.9032497406006,
          isFront: false,
          isNumber: false,
          lowerCase: 'panini'
        },
        {
          word: 'nu',
          words: ['nu'],
          wordCount: 1,
          confidence: 301.8456654548645,
          isFront: false,
          isNumber: false,
          lowerCase: 'nu'
        },
        {
          word: 'Sports uniform',
          words: ['Sports', 'uniform'],
          confidence: 102.97373753786087,
          isFront: true,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'sports uniform'
        },
        {
          word: 'Sports equipment',
          words: ['Sports', 'equipment'],
          confidence: 102.95562589168549,
          isFront: true,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'sports equipment'
        },
        {
          word: 'Helmet',
          words: ['Helmet'],
          confidence: 102.94848012924194,
          isFront: true,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'helmet'
        },
        {
          word: 'Sports gear',
          words: ['Sports', 'gear'],
          confidence: 102.93427032232285,
          isFront: true,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'sports gear'
        },
        {
          word: 'Sports jersey',
          words: ['Sports', 'jersey'],
          confidence: 102.92018640041351,
          isFront: true,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'sports jersey'
        },
        {
          word: 'Jersey',
          words: ['Jersey'],
          confidence: 102.91633689403534,
          isFront: true,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'jersey'
        },
        {
          word: 'Sleeve',
          words: ['Sleeve'],
          confidence: 102.87196761369705,
          isFront: true,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'sleeve'
        },
        {
          word: 'Baseball equipment',
          words: ['Baseball', 'equipment'],
          confidence: 102.86210042238235,
          isFront: true,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'baseball equipment'
        },
        {
          word: 'Player',
          words: ['Player'],
          confidence: 102.85287743806839,
          isFront: true,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'player'
        },
        {
          word: 'Ball',
          words: ['Ball'],
          confidence: 102.8268551826477,
          isFront: true,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'ball'
        },
        {
          word: 'Font',
          words: ['Font'],
          confidence: 101.82611882686615,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'font'
        },
        {
          word: 'Electric blue',
          words: ['Electric', 'blue'],
          confidence: 101.74907094240189,
          isFront: false,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'electric blue'
        },
        {
          word: 'Publication',
          words: ['Publication'],
          confidence: 101.71070563793182,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'publication'
        },
        {
          word: 'Fictional character',
          words: ['Fictional', 'character'],
          confidence: 101.70362371206284,
          isFront: false,
          wordCount: 2,
          isNumber: false,
          lowerCase: 'fictional character'
        },
        {
          word: 'Advertising',
          words: ['Advertising'],
          confidence: 101.69657796621323,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'advertising'
        },
        {
          word: 'Rectangle',
          words: ['Rectangle'],
          confidence: 101.6762467622757,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'rectangle'
        },
        {
          word: 'Poster',
          words: ['Poster'],
          confidence: 101.66524356603622,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'poster'
        },
        {
          word: 'Machine',
          words: ['Machine'],
          confidence: 101.64406055212021,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'machine'
        },
        {
          word: 'Symbol',
          words: ['Symbol'],
          confidence: 101.57871788740158,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'symbol'
        },
        {
          word: 'Art',
          words: ['Art'],
          confidence: 101.53925794363022,
          isFront: false,
          wordCount: 1,
          isNumber: false,
          lowerCase: 'art'
        }
      ];
      ImageRecognition.callNLP = jest.fn().mockResolvedValue([
        {
          entity_group: 'ORG',
          score: 0.988547146320343,
          word: 'new york giants',
          start: 0,
          end: 15
        },
        {
          entity_group: 'MISC',
          score: 0.4893135726451874,
          word: 'sul',
          start: 17,
          end: 20
        },
        {
          entity_group: 'ORG',
          score: 0.9380016922950745,
          word: 'nfl',
          start: 25,
          end: 28
        },
        {
          entity_group: 'ORG',
          score: 0.987401008605957,
          word: 'new york giants',
          start: 30,
          end: 45
        },
        {
          entity_group: 'ORG',
          score: 0.9764724969863892,
          word: 'national football league players association',
          start: 47,
          end: 91
        },
        {
          entity_group: 'PER',
          score: 0.9975985288619995,
          word: 'daniel jones',
          start: 186,
          end: 198
        },
        {
          entity_group: 'PER',
          score: 0.9973742365837097,
          word: 'daniel jones',
          start: 207,
          end: 219
        },
        {
          entity_group: 'PER',
          score: 0.9969354867935181,
          word: 'y',
          start: 221,
          end: 222
        },
        {
          entity_group: 'PER',
          score: 0.907669723033905,
          word: '.',
          start: 222,
          end: 223
        },
        {
          entity_group: 'PER',
          score: 0.7854845523834229,
          word: 'a',
          start: 223,
          end: 224
        },
        {
          entity_group: 'PER',
          score: 0.9052554965019226,
          word: '. tittle',
          start: 224,
          end: 232
        },
        {
          entity_group: 'ORG',
          score: 0.9947426319122314,
          word: 'giants',
          start: 247,
          end: 253
        },
        {
          entity_group: 'PER',
          score: 0.9970929026603699,
          word: 'phil simms',
          start: 387,
          end: 397
        },
        {
          entity_group: 'PER',
          score: 0.9968534708023071,
          word: 'eli manning',
          start: 400,
          end: 411
        },
        {
          entity_group: 'PER',
          score: 0.9927091598510742,
          word: 'jones',
          start: 416,
          end: 421
        },
        {
          entity_group: 'LOC',
          score: 0.7553538084030151,
          word: 'new york',
          start: 424,
          end: 432
        },
        {
          entity_group: 'LOC',
          score: 0.9641816020011902,
          word: 'new orleans',
          start: 507,
          end: 518
        },
        {
          entity_group: 'ORG',
          score: 0.9153343439102173,
          word: 'panini',
          start: 593,
          end: 599
        },
        {
          entity_group: 'ORG',
          score: 0.9819995164871216,
          word: 'panini america, inc',
          start: 623,
          end: 643
        },
        {
          entity_group: 'LOC',
          score: 0.9782465696334839,
          word: 'usa',
          start: 661,
          end: 664
        },
        {
          entity_group: 'ORG',
          score: 0.991025447845459,
          word: 'giants',
          start: 751,
          end: 757
        },
        {
          entity_group: 'ORG',
          score: 0.8955340385437012,
          word: 'nfl nflpa',
          start: 792,
          end: 801
        },
        {
          entity_group: 'ORG',
          score: 0.9563997387886047,
          word: 'panini',
          start: 803,
          end: 809
        },
        {
          entity_group: 'ORG',
          score: 0.8527081608772278,
          word: 'nu',
          start: 811,
          end: 813
        }
      ]);
      expect(await runNLP(input)).toEqual({
        player: "Daniel Jones",
      });
    });

  });

});
