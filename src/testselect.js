import 'zx/globals';
import { prepareImageFile } from "./image-processing/imageProcessor.js";

const cardData = {
  directory: '',
  filename: 'not-as-large.jpg',
  crop: {
    left: 0,
    top: 0,
    width: 100,
    height: 100
  }
}
await prepareImageFile('input/large.jpg', cardData, true)