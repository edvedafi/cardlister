import { readFileSync } from 'fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore as getFirestoreAdmin } from 'firebase-admin/firestore';
import chalk from 'chalk';
import { useSpinners } from './spinners.js';
import { getStorage as getFirebaseStorage } from 'firebase-admin/storage';

let _db = null;
let _firebase = null;
let _storage = null;

const color = chalk.hex('#ffc107');
const log = (...params) => console.log(color(...params));
const { showSpinner, finishSpinner, updateSpinner, errorSpinner, pauseSpinners, resumeSpinners } = useSpinners(
  'firebase',
  color,
);
export default function initializeFirebase() {
  showSpinner('firebase', 'Initializing Firebase');
  //instantiate firebase
  const hofDBJSON = JSON.parse(readFileSync('./hofdb-2038e-firebase-adminsdk-jllij-4025146e4e.json'));
  const firebaseConfig = {
    credential: cert(hofDBJSON),
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: 'hofdb-2038e.firebaseapp.com',
    projectId: 'hofdb-2038e',
    storageBucket: 'hofdb-2038e.appspot.com',
    messagingSenderId: '78796187147',
    appId: '1:78796187147:web:aa89f01d66d63dfc5d490e',
    measurementId: 'G-4T1D5KNQ7N',
  };
  _firebase = initializeApp(firebaseConfig);
  finishSpinner('firebase', 'Using Firebase');
  return _firebase;
}

export const initializeStorage = (app) => {
  showSpinner('storage', 'Initializing Firebase Storage');
  _storage = getFirebaseStorage(app);
  finishSpinner('storage', 'Using Firebase Storage');
};

export function getFirestore() {
  if (!_db) {
    _db = getFirestoreAdmin(getFirebase());
  }
  return _db;
}
export function getFirebase() {
  if (!_firebase) {
    initializeFirebase();
  }
  return _firebase;
}

export function getStorage() {
  if (!_storage) {
    initializeStorage();
  }
  return _storage;
}
