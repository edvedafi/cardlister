import { useSpinners } from '../utils/spinners.js';
import { VertexAI } from '@google-cloud/vertexai';
import { ask } from '../utils/ask.js';

const { showSpinner, log } = useSpinners('img-recog', chalk.hex('#4285F4'));

export async function createNonStreamingMultipartContent(
  images = ['gs://generativeai-downloads/images/scones.jpg'],
  model = 'gemini-1.0-pro-vision',
  projectId = 'hofdb-2038e',
  location = 'us-central1',
) {
  const { update, error, finish } = showSpinner(images[0], `Image Recognition for ${images}`);
  update('Initialize Vertex AI client');
  // Initialize Vertex with your Cloud project and location
  const vertexAI = new VertexAI({ project: projectId, location: location });

  // Instantiate the model
  const generativeVisionModel = vertexAI.getGenerativeModel({
    model: model,
  });

  update('Create the request');
  // For images, the SDK supports both Google Cloud Storage URI and base64 strings
  const imageParts = images.map((imagePath) => ({
    inline_data: {
      data: fs.readFileSync(imagePath).toString('base64'),
      mime_type: 'image/jpeg',
    },
  }));

  //read the text contents of prompt.txt
  let prompt = fs.readFileSync('./src/card-data/prompt.txt', 'utf8');
  const runModel = async (additionalPrompt) => {
    prompt = prompt + additionalPrompt;

    const request = {
      contents: [
        {
          role: 'user',
          parts: [...imageParts, { text: prompt }],
        },
      ],
    };

    update('Running Request');
    const response = await generativeVisionModel.generateContent(request);

    update('Wait for the response');
    const aggregatedResponse = await response.response;

    update('Process the response');

    log(aggregatedResponse);

    const textResult = aggregatedResponse.candidates[0].content.parts[0].text;

    return JSON.parse(textResult.substring(textResult.indexOf('{'), textResult.lastIndexOf('}') + 1));
  };

  let userInput = 'First Test';
  let jsonResult;
  while (userInput) {
    jsonResult = await runModel('');

    log(jsonResult);

    userInput = await ask('Would you like to add more text to the prompt?');
  }

  finish();
  return jsonResult;
}
