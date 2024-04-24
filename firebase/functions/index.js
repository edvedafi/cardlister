/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');

// The Firebase Admin SDK to access Firestore.
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();

exports.helloWorld = onRequest((request, response) => {
  logger.info('Hello logs!', { structuredData: true });
  logger.info(request.body, { structuredData: true });
  logger.info(request.text, { structuredData: true });
  response.send('Hello from Firebase!');
});
