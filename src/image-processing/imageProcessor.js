import { ask } from '../utils/ask.js';
import terminalImage from 'terminal-image';
import sharp from 'sharp';
import fs from 'fs-extra';
import { useSpinners } from '../utils/spinners.js';
import chalk from 'chalk';
import { removeBackgroundFromImageFile } from 'remove.bg';

const { showSpinner, log } = useSpinners('images', chalk.white);

const output_directory = 'output/';
const MAX_IMAGE_SIZE = 10 * 1000 * 1000; // slightly under 10MB

function getOutputFile(cardData) {
  const outputLocation = `${output_directory}${cardData.directory}`;
  const outputFile = `${outputLocation}${cardData.filename}`;
  return { outputLocation, outputFile };
}

export const prepareImageFile = async (image, cardData, overrideImages) => {
  const { update, error, finish } = showSpinner('crop', 'Preparing Image');
  const { outputLocation, outputFile } = getOutputFile(cardData);
  let input = image;
  // let rotation = await ask('Rotate', false);
  let rotate;
  // if (isYes(rotation)) {
  //   rotate = -90
  // } else if (isNaN(rotation)) {
  //   rotate = 0;
  // } else {
  //   rotate = rotation || 0;
  // }
  //if the output file already exists, skip it
  if (!overrideImages && fs.existsSync(outputFile)) {
    log('Image already exists, skipping');
  } else {
    await $`mkdir -p ${outputLocation}`;

    if (fs.existsSync(outputFile)) {
      fs.removeSync(outputFile);
    }

    const tempDirectory = '/tmp/cardlister';
    await fs.ensureDir(tempDirectory);
    let tempImage = `${tempDirectory}/temp.jpg`;

    if (rotate) {
      await $`magick ${input} -rotate ${rotate} ${tempDirectory}/temp.rotated.jpg`;
      input = `${tempDirectory}/temp.rotated.jpg`;
    }

    const cropAttempts = [
      async () => {
        tempImage = `${tempDirectory}/CC.rotate.jpg`;
        return await $`./CardCropper.rotate ${input} ${tempImage}`;
      },
      async () => {
        tempImage = `${tempDirectory}/remove.bg.jpg`;
        const result = await removeBackgroundFromImageFile({
          path: input,
          apiKey: process.env.REMOVE_BG_KEY,
          size: 'regular',
          type: 'other',
          crop: true,
          crop_margin: 10,
          outputFile: tempImage,
        });
      },
      async () => {
        tempImage = `${tempDirectory}/sharp.extract.jpg`;
        return await sharp(input).extract(cardData.crop).toFile(tempImage);
      },
      async () => {
        tempImage = `${tempDirectory}/sharp.trimp.jpg`;
        return await sharp(input).trim({ threshold: 50 }).toFile(tempImage);
      },
      async () => {
        tempImage = `${tempDirectory}/CC.crop.jpg`;
        return await $`./CardCropper ${input} ${tempImage}`;
      },
      async () => {
        tempImage = `${tempDirectory}/manual.jpg`;
        const openCommand = await $`cp ${input} ${tempImage}; open -Wn ${tempImage}`;
        // const openCommand = $`open -Wn ${tempImage}`;
        process.on('SIGINT', () => openCommand?.kill());
        return openCommand;
      },
    ];
    let found = false;
    let i = 0;
    while (!found && i < cropAttempts.length) {
      try {
        update(`Attempting crop ${i}/${cropAttempts.length}`);
        await cropAttempts[i]();
        log(await terminalImage.file(tempImage, { height: 25 }));
        found = await ask('Did Image render correct?', true);
      } catch (e) {
        log(e);
      }
      i++;
    }

    if (found) {
      const buffer = await sharp(tempImage).toBuffer();
      if (buffer.length > MAX_IMAGE_SIZE) {
        const compressionRatio = MAX_IMAGE_SIZE / buffer.length;
        const outputQuality = Math.floor(compressionRatio * 100);
        await sharp(buffer).jpeg({ quality: outputQuality }).toFile(outputFile);
        await $`rm ${tempImage}`;
      } else {
        await $`mv ${tempImage} ${outputFile}`;
      }

      finish();
      return outputFile;
    } else {
      const e = new Error('Failed to crop image');
      error(e);
      throw e;
    }
  }
};
