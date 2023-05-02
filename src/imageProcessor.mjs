import {ask} from "./ask.mjs";
import {isYes} from "./utils/data.mjs";
import {getStorage} from "firebase-admin/storage";

import cv from '@u4/opencv4nodejs';

const output_directory = 'output/';

let storage;

export const initializeStorage = (app) => {
  storage = getStorage(app);
}

// an OpenCV Option to crop the largest object, however it does not work at the time of writing
async function cropLargestObject(input, output, debugname) {
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

    const croppedImg = img.getRegion(new cv.Rect(
      obj.x,
      obj.y,
      obj.width,
      obj.height
    ));

    // Save the cropped image
    cv.imwrite(`${output_directory}debug_${debugname}_${obj.x}_${obj.y}_${obj.height}_${obj.width}`, croppedImg);
  });

  // Crop the image based on the detected object
  const padding = 0;
  const croppedImg = img.getRegion(new cv.Rect(
    largestObject.x - padding,
    largestObject.y - padding,
    largestObject.width + padding,
    largestObject.height + padding
  ));

  // Save the cropped image
  cv.imwrite(output, croppedImg);
}

const padding = 30;
const getMin = (coordinates, dimension) => {
  let min = Math.min(...coordinates.map(dimension));
  console.log(`min: ${min}, points:`, coordinates.map(dimension).join(', '));
  if (min - padding > 0) {
    min -= padding;
  } else {
    min = 0;
  }
  return min;
}

const getMax = (coordinates, dimension, maxDimension) => {
  let max = Math.max(...coordinates.map(dimension));
  // if (max + padding < maxDimension) {
  //   max += padding;
  // } else {
  //   max = maxDimension;
  // }
  return max + padding
}

function saveRectangleImage(image, rectangle, output) {
  try {
    if (rectangle) {
      const coordinates = rectangle.getPoints();
      // console.log('Rectangle coordinates', coordinates);
      // Get the minimum and maximum X and Y coordinates
      const minX = getMin(coordinates, point => point.x);
      const minY = getMin(coordinates, point => point.y);
      const maxX = getMax(coordinates, point => point.x, image.cols);
      const maxY = getMax(coordinates, point => point.y, image.rows);

      console.log(`printing ${minX}, ${minY}, ${maxX}, ${maxY}`);

      // Crop the image
      // const cropped = image.getRegion(new cv.Rect(minX, minY, maxX - minX, maxY - minY));
      const cropped = image.getRegion(rectangle.boundingRect());
      // Save the cropped image
      cv.imwrite(output, cropped);
      // console.log(`Cropped image saved as ${output}`);
    } else {
      console.log('No rectangle found.');
    }
  } catch (e) {
    console.error('Error saving rectangle image', e);
    throw e;
  }
}

// an OpenCV Option to crop the largest rectangle, however it does not work at the time of writing
async function detectLargestRectangleAndCrop(imagePath, output, debugname) {
  // Read the image
  const src = cv.imread(imagePath);

  // Convert the image to grayscale
  const gray = src.cvtColor(cv.COLOR_BGR2GRAY);
  // Apply Gaussian blur
  const blurred = gray.gaussianBlur(new cv.Size(5, 5), 0);
  // Apply Canny edge detection
  const edges = blurred.canny(25, 200);
  // console.log('Canny edge detection applied', edges);
  // Find contours
  // const contours = edges.findContours(cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
  const contours = edges.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_NONE);
  // console.log('Contours found', contours);
  // Filter contours that form a rectangle
  const rectContours = contours.filter((contour) => {
    const approx = contour.approxPolyDP(0.02 * contour.arcLength(true), true);
    return approx.length === 4;
  });
  // console.log('Rectangles found', rectContours);
  // Find the largest rectangle

  let maxArea = 0;
  let largestRect = null;
  let largestRectIndex = null;
  rectContours.forEach((rect, index) => {
    const area = rect.area;
    console.log(`Rectangle ${index} has area ${area} compared to max area ${maxArea}`);
    if (area > maxArea) {
      maxArea = area;
      largestRect = rect;
      largestRectIndex = index;
    }

    // saveRectangleImage(src, largestRect, `output/debug/${debugname}_${ index }.jpg`);
  });


  if (largestRect) {

    console.log(`Largest rectangle found ${largestRectIndex} has size ${maxArea}`);

    // if ( largestRectIndex === 798 ) {
    //   console.log(`points:`, largestRect.getPoints());
    // }
    // Get the coordinates of the rectangle
    saveRectangleImage(src, largestRect, output);
    console.log(`Cropped image saved as ${output}`);
  } else {
    console.log('No rectangle found.');
  }
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

  const outputLocation = `${output_directory}${cardData.directory}`;

  await $`mkdir -p ${outputLocation}`;

  if (rotate) {
    await $`magick ${image} -rotate ${rotate} ${output_directory}temp.jpg`;
    // await detectLargestRectangleAndCrop(`${output_directory}temp.jpg`, `${outputLocation}${cardData.filename}`);
    await $`swift src/CardCropper.swift ${output_directory}temp.jpg ${outputLocation}${cardData.filename}`
  } else {
    // await detectLargestRectangleAndCrop(image, `${outputLocation}${cardData.filename}`, cardData.filename);
    await $`swift src/CardCropper.swift ${image} ${outputLocation}${cardData.filename}`
  }

  // upload file to firebase storage
  await storage.bucket().upload(image, {destination: cardData.filename});
}
