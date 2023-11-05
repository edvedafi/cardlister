import { ask } from './ask.js';
import { ensureDir } from 'fs-extra/esm';
import unzip from 'decompress';

export async function getInputs() {
  if (process.argv.length > 2) {
    // console.log(process.argv[2]);
    const zipFile = process.argv[2];
    if (zipFile.endsWith('.zip')) {
      const dir = `input/${zipFile
        .split('/')
        .pop()
        .split('.')[0]
        .replace(/[\s()]/g, '_')}/`;
      await ensureDir(dir);
      await unzip(zipFile, dir);
      console.log(`Input Directory: ${dir}`);
      return dir;
    } else if (zipFile.indexOf('input') > -1) {
      console.log(`Input Directory: ${zipFile}`);
      return zipFile;
    } else {
      console.log(`Input Directory: input/${zipFile}/`);
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
  } else if (input_directory.indexOf('/') !== input_directory.length - 1) {
    input_directory = `input/${input_directory}/`;
  } else {
    input_directory = `input/${input_directory}`;
  }
  console.log(`Input Directory: ${input_directory}`);
  return input_directory;
};

export const getFiles = async (inputDirectory) => {
  try {
    const lsOutput = await $`ls ${inputDirectory}PXL*.jpg`;
    return lsOutput
      .toString()
      .split('\n')
      .filter((image) => image !== '');
  } catch (e) {
    return [];
  }
};

export const setEnvValue = (key, value) => {
  // read file from hdd & split if from a linebreak to a array
  const ENV_VARS = fs.readFileSync('./.env', 'utf8').split(os.EOL);

  // find the env we want based on the key
  const target = ENV_VARS.indexOf(
    ENV_VARS.find((line) => {
      return line.match(new RegExp(key));
    }),
  );

  // replace the key/value with the new value
  ENV_VARS.splice(target, 1, `${key}=${value}`);

  // write everything back to the file system
  fs.writeFileSync('./.env', ENV_VARS.join(os.EOL));
};
