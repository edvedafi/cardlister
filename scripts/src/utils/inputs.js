import { ask } from './ask.js';
import { ensureDir } from 'fs-extra/esm';
import unzip from 'decompress';
import chalk from 'chalk';
import { useSpinners } from './spinners.js';

const log = (...params) => console.log(chalk.cyan(...params));
const { showSpinner, finishSpinner, errorSpinner } = useSpinners('trim', chalk.cyan);

export async function getInputs() {
  showSpinner('inputs', 'Getting Input Information');
  if (process.argv.length > 2) {
    // console.log(process.argv[2]);
    const zipFile = process.argv[2];
    if (zipFile === '-r') {
      return await getInputDirectory();
    } else if (zipFile.endsWith('.zip')) {
      const dir = `input/${zipFile
        .split('/')
        .pop()
        .split('.')[0]
        .replace(/[\s()]/g, '_')}/`;
      await ensureDir(dir);
      await unzip(zipFile, dir);
      finishSpinner('inputs', `Input Directory: ${dir}`);
      return dir;
    } else if (zipFile.indexOf('input') > -1) {
      finishSpinner('inputs', `Input Directory: ${zipFile}`);
      return zipFile;
    } else {
      finishSpinner('inputs', `Input Directory: input/${zipFile}/`);
      return `input/${zipFile}/`;
    }
  } else {
    return await getInputDirectory();
  }
}

export const getInputDirectory = async () => {
  const directories = fs.readdirSync('input', { withFileTypes: true });
  const inputDirectories = ['input', 'bulk', ...directories.filter((dir) => dir.isDirectory()).map((dir) => dir.name)];
  let input_directory = await ask('Input Directory', undefined, { selectOptions: inputDirectories });
  if (input_directory === 'input') {
    input_directory = 'input/';
  } else if (input_directory === 'bulk') {
    //check to see if the bulk directory exists
    if (fs.existsSync('input/bulk')) {
      const shouldRest = await ask('Reset Bulk?', false);
      if (shouldRest) {
        //delete everything in the bulk directory
        fs.rmSync('input/bulk', { recursive: true });
        fs.mkdirSync('input/bulk');
      }
    } else {
      fs.mkdirSync('input/bulk');
    }
    input_directory = `input/bulk/`;
  } else if (input_directory.indexOf('/') !== input_directory.length - 1) {
    input_directory = `input/${input_directory}/`;
  } else {
    input_directory = `input/${input_directory}`;
  }
  finishSpinner('inputs', `Input Directory: ${input_directory}`);

  return input_directory;
};

export const getFiles = async (inputDirectory) => {
  showSpinner('inputs', 'Getting Files');
  let files = [];
  try {
    const lsOutput = await $`ls ${inputDirectory}PXL*.jpg`;
    files = lsOutput
      .toString()
      .split('\n')
      .filter((image) => image !== '');
    finishSpinner('inputs', `Found ${files.length} Files`);
  } catch (e) {
    files = [];
    errorSpinner('inputs', `No Files Found`);
  }
  return files;
};
