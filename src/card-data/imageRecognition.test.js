import {copyRightYearRegexMatch} from './imageRecognition.js';

describe('copyRightYearRegexMatch', () => {
  it('should match "© 2021"', () => {
    expect(copyRightYearRegexMatch('© 2021')).toEqual('2021');
  });
  it('should match "©2021"', () => {
    expect(copyRightYearRegexMatch('©2021')).toEqual('2021');
  });
});
