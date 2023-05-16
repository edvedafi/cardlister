import {ask} from "../utils/ask.js";
import {isYes} from "../utils/data.js";
import {getStorage} from "firebase-admin/storage";
import terminalImage from "terminal-image";
import sharp from 'sharp';
import fs from 'fs-extra';

// import cv from '@u4/opencv4nodejs';

const output_directory = 'output/';

let storage;

export const initializeStorage = (app) => {
  storage = getStorage(app);
}

export const processImageFile = async (image, cardData, overrideImages) => {
  const outputLocation = `${output_directory}${cardData.directory}`;
  const outputFile = `${outputLocation}${cardData.filename}`;
  let input = image;
  let rotation = await ask('Rotate', false);
  let rotate;
  if (isYes(rotation)) {
    rotate = -90
  } else if (isNaN(rotation)) {
    rotate = 0;
  } else {
    rotate = rotation || 0;
  }
  //if the output file already exists, skip it
  if (!overrideImages && fs.existsSync(outputFile)) {
    console.log('Image already exists, skipping');
  } else {
    await $`mkdir -p ${outputLocation}`;

    if (fs.existsSync(outputFile)) {
      fs.removeSync(outputFile);
    }

    let goodImage = false;
    let tempImage = 'output/temp.jpg';

    try {
      if (rotate) {
        await $`magick ${input} -rotate ${rotate} ${output_directory}temp.rotated.jpg`;
        input = `${output_directory}temp.rotated.jpg`;
      }

      const cropImage = async (cropCommand) => {
        try {
          await cropCommand();
          console.log(await terminalImage.file(tempImage, {height: 25}));
          return await ask('Did Image render correct?', true);
        } catch (e) {
          console.log(`${cropCommand} failed`, e);
        }
      }

      // if (!goodImage) {
      //   goodImage = await cropImage(async () => {
      //     await sharp(input).trim({threshold: 50}).toFile(tempImage);
      //   });
      // }

      if (!goodImage && cardData.crop) {
        goodImage = await cropImage(async () => {
          await sharp(input).extract(cardData.crop).toFile(tempImage);
        });
      }

      if (!goodImage) {
        goodImage = await cropImage(async () => {
          await $`swift src/image-processing/CardCropper.rotate.swift ${input} ${tempImage}`
        });
      }

      if (!goodImage) {
        goodImage = await cropImage(async () => {
          await sharp(input).extract(cardData.crop).toFile(tempImage);
        });
      }

      if (!goodImage) {
        goodImage = await cropImage(async () => {
          await $`swift src/image-processing/CardCropper.swift ${input} ${tempImage}`
        });
      }

    } catch (e) {
      console.error('Error cropping image', e);
      goodImage = false;
    }

    if (goodImage) {
      await fs.copyFile(tempImage, outputFile);
    } else {
      await $`open -Wn ${input}`;
      await fs.copyFile(input, outputFile);
    }

    // upload file to firebase storage
    storage.bucket().upload(outputFile, {destination: cardData.filename}).catch(e => {
      console.error(`Error uploading ${outputFile}`, e);
      process.exit(1);
    });
  }
}
