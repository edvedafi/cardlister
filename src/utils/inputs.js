import { ask } from "./ask.js";
import { ensureDir } from "fs-extra/esm";
import unzip from "decompress";

export async function getInputs() {
  if (process.argv.length > 2) {
    // console.log(process.argv[2]);
    const zipFile = process.argv[2];
    const dir = `input/${zipFile
      .split("/")
      .pop()
      .split(".")[0]
      .replace(/[\s()]/g, "_")}/`;
    await ensureDir(dir);
    await unzip(zipFile, dir);
    console.log(`Input Directory: ${dir}`);
    return dir;
  } else {
    return await getInputDirectory();
  }
}

export const getInputDirectory = async () => {
  let input_directory = await ask("Input Directory", "input");
  if (input_directory === "input") {
    input_directory = "input/";
  } else if (input_directory.indexOf("/") !== input_directory.length - 1) {
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
      .split("\n")
      .filter((image) => image !== "");
  } catch (e) {
    return [];
  }
};
