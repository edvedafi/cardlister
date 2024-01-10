import { ask } from '../utils/ask.js';
import terminalImage from 'terminal-image';
import sharp from 'sharp';
import fs from 'fs-extra';
import { pauseSpinners, resumeSpinners, useSpinners } from '../utils/spinners.js';
import chalk from 'chalk';

const { showSpinner, finishSpinner, errorSpinner, updateSpinner, log } = useSpinners('images', chalk.white);

const output_directory = 'output/';
const MAX_IMAGE_SIZE = 10 * 1000 * 1000; // slightly under 10MB

function getOutputFile(cardData) {
  const outputLocation = `${output_directory}${cardData.directory}`;
  const outputFile = `${outputLocation}${cardData.filename}`;
  return { outputLocation, outputFile };
}

export const prepareImageFile = async (image, cardData, overrideImages) => {
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
    console.log('Image already exists, skipping');
  } else {
    await $`mkdir -p ${outputLocation}`;

    if (fs.existsSync(outputFile)) {
      fs.removeSync(outputFile);
    }

    let tempImage = 'output/temp/temp.jpg';

    if (rotate) {
      await $`magick ${input} -rotate ${rotate} ${output_directory}temp.rotated.jpg`;
      input = `${output_directory}temp.rotated.jpg`;
    }

    const cropAttempts = [
      () => {
        tempImage = 'output/temp/CC.rotate.jpg';
        return $`./CardCropper.rotate ${input} ${tempImage}`;
      },
      () => {
        tempImage = 'output/temp/sharp.extract.jpg';
        return sharp(input).extract(cardData.crop).toFile(tempImage);
      },
      () => {
        tempImage = 'output/temp/sharp.trimp.jpg';
        return sharp(input).trim({ threshold: 50 }).toFile(tempImage);
      },
      () => {
        tempImage = 'output/temp/CC.crop.jpg';
        return $`./CardCropper ${input} ${tempImage}`;
      },
      async () => {
        tempImage = 'output/temp/manual.jpg';
        await $`cp ${input} ${tempImage}`;
        const openCommand = $`open -Wn ${tempImage}`;
        process.on('SIGINT', () => openCommand?.kill());
        return openCommand;
      },
    ];
    let found = false;
    let i = 0;
    while (!found && i < cropAttempts.length) {
      try {
        showSpinner('crop', `Attempting crop ${i}/${cropAttempts.length}`);
        await cropAttempts[i]();
        finishSpinner('crop');
        pauseSpinners();
        console.log(await terminalImage.file(tempImage, { height: 25 }));
        found = await ask('Did Image render correct?', true);
        resumeSpinners();
      } catch (e) {
        resumeSpinners();
        errorSpinner('crop', `Failed to crop image ${e.message}`);
      }
      i++;
    }

    const buffer = await sharp(tempImage).toBuffer();
    if (buffer.length > MAX_IMAGE_SIZE) {
      const compressionRatio = MAX_IMAGE_SIZE / buffer.length;
      const outputQuality = Math.floor(compressionRatio * 100);
      await sharp(buffer).jpeg({ quality: outputQuality }).toFile(outputFile);
      await $`rm ${tempImage}`;
    } else {
      await $`mv ${tempImage} ${outputFile}`;
    }

    return outputFile;
  }
};
