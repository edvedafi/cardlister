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

function getOutputFile(cardData) {
  const outputLocation = `${output_directory}${cardData.directory}`;
  const outputFile = `${outputLocation}${cardData.filename}`;
  return {outputLocation, outputFile};
}

export const prepareImageFile = async (image, cardData, overrideImages) => {
  const {outputLocation, outputFile} = getOutputFile(cardData);
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

      if (!goodImage) {
        goodImage = await cropImage(async () => {
          await sharp(input).trim('black').trim('green').trim('black').trim('green').toFile(tempImage);
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

      if (!goodImage) {
        goodImage = await cropImage(async () => {
          await sharp(input).trim({threshold: 50}).toFile(tempImage);
        });
      }

      if (!goodImage && cardData.crop) {
        goodImage = await cropImage(async () => {
          await sharp(input).extract(cardData.crop).toFile(tempImage);
        });
      }

    } catch (e) {
      console.error('Error cropping image', e);
      goodImage = false;
    }

    let preResize;;
    if (goodImage) {
      preResize = tempImage;
    } else {
      await $`open -Wn ${input}`;
      preResize = input;
    }

    const maxSizeInBytes = 10 * 1000 * 1000; // slightly under 10MB

    sharp(preResize)
      .resize({ fit: 'inside', width: 1024, height: 1024 }) 
      .toBuffer((err, buffer) => {
        if (err) {
          console.error('Error resizing the image:', err);
        } else {
          if (buffer.length > maxSizeInBytes) {
            const compressionRatio = maxSizeInBytes / buffer.length;
            const outputQuality = Math.floor(compressionRatio * 100);

            sharp(buffer)
              .jpeg({ quality: outputQuality })
              .toFile(outputFile, (err) => {
                if (err) {
                  console.error('Error saving the resized image:', err);
                } else {
                  console.log('Resized image saved successfully!');
                }
              });
          } else {
            fs.writeFileSync(outputFile, buffer);
            // console.log('Image size iWE s already within the limit. Saved as is.');
          }
        }
      });
    
    return outputFile
  }
}

// upload file to firebase storage
export const processImageFile = async (outputFile, filename) => {
  let promise;
  try {
    promise = storage.bucket().upload(outputFile, {destination: filename});
  } catch (e) {
    console.error(`Error uploading ${outputFile}`, e);
    process.exit(1);
  }
  return promise
}
