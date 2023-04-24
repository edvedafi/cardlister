import {ask} from "./ask.mjs";
import {isYes} from "./utils/data.mjs";
import {getStorage} from "firebase-admin/storage";

const cv = require('@u4/opencv4nodejs');
const fs = require('fs');

const output_directory = 'output/';

let storage;

export const initializeStorage = (app) => {
  storage = getStorage(app);
}

async function detectRectangleAndCrop(inputFile, outputFile) {
  try {
    const src = await cv.imreadAsync(inputFile);
    const gray = src.cvtColor(cv.COLOR_BGR2GRAY);
    const blurred = gray.gaussianBlur(new cv.Size(5, 5), 0);
    const edged = blurred.canny(50, 200);

    const contours = edged.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let maxArea = 0;
    let bestContour = null;

    for (let i = 0; i < contours.length; i++) {
      const contour = contours[i];
      const area = contour.area;

      if (area > maxArea) {
        const arcLength = contour.arcLength(true);
        const approx = contour.approxPolyDP(0.02 * arcLength, true);

        if (approx.length === 4) {
          maxArea = area;
          bestContour = approx;
        }
      }
    }

    if (bestContour) {
      const points = bestContour
        .map(pt => [pt.x, pt.y])
        .sort((a, b) => a[0] - b[0] || a[1] - b[1]);

      const topLeft = points[0];
      const bottomRight = points[2];
      const rect = new cv.Rect(topLeft[0], topLeft[1], bottomRight[0] - topLeft[0], bottomRight[1] - topLeft[1]);
      const cropped = src.getRegion(rect);

      await cv.imwriteAsync(outputFile, cropped);
      console.log('Rectangle detection and cropping successful');
    } else {
      console.log('No rectangle found');
    }
  } catch (err) {
    console.error('Error processing the image:', err);
  }
}

async function cropLargestObject(input, output) {
  const img = cv.imread(input);
  const grayImg = img.bgrToGray();
  const classifier = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_ALT2);

  const {objects} = classifier.detectMultiScale(grayImg);

  // Find the largest detected object, which should be the baseball card
  let largestObject = {x: 0, y: 0, width: 0, height: 0};
  objects.forEach(obj => {
    if (obj.width * obj.height > largestObject.width * largestObject.height) {
      largestObject = obj;
    }
  });

  // Crop the image based on the detected object
  const croppedImg = img.getRegion(new cv.Rect(largestObject.x, largestObject.y, largestObject.width, largestObject.height));

  // Save the cropped image
  cv.imwrite(output, croppedImg);
}


export const processImageFile = async (image, cardData) => {
  let rotation = await ask('Rotate? ');
  let rotate;
  if (isYes(rotation)) {
    rotate = -90
  } else if (isNaN(rotation)) {
    rotate = 0;
  } else {
    rotate = rotation || 0;
  }

  await $`mkdir -p ${output_directory}${cardData.directory}`;

  if (rotate) {
    await $`magick ${image} -rotate ${rotate} ${output_directory}temp.jpg`;
    await cropLargestObject(`${output_directory}temp.jpg`, `${output_directory}${cardData.filename}`);
  } else {
    await cropLargestObject(image, `${output_directory}${cardData.filename}`);
  }

  // upload file to firebase storage
  await storage.bucket().upload(image, {destination: cardData.filename});
}
