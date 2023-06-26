jest.mock('./utils/ask.js');
jest.mock('fs-extra/esm');
jest.mock('decompress');

import { getInputs } from "./inputs";
import {ask} from "./utils/ask.js";
import { ensureDir } from "fs-extra/esm";
import unzip from 'decompress';

global.cd = jest.fn();

beforeEach(() => {
  ask.mockReset();
  cd.mockReset();
  ensureDir.mockReset();
  unzip.mockReset();
});

afterEach(() => {
  ask.mockReset();
  cd.mockReset();
  ensureDir.mockReset();
  unzip.mockReset();
});

describe('getInputs', () => {
  it('should ask for the input directory if no arguments are passed', async() => {

    ask.mockResolvedValue('testdir');

    const result = await getInputs();

    expect(ask.mock.calls.length).toBe(1);
    expect(result).toBe('input/testdir/');
  });

  it('should unzip the zip file if one is passed', async() => {
    process.argv = ['node', 'src/inputs.js', '/home/username/Downloads/testzip.zip'];

    const result = await getInputs();

    expect(ensureDir).toHaveBeenCalledWith('input/testzip/');
    expect(cd).toHaveBeenCalledWith('input/testzip/');
    expect(unzip).toHaveBeenCalledWith('/home/username/Downloads/testzip.zip');
    expect(cd).toHaveBeenCalledWith('../../');
    expect(result).toBe('input/testzip/');
  });

});