import { readFileSync } from "fs";
import { cert, initializeApp } from "firebase-admin/app";

export default function initializeFirebase() {
  //instantiate firebase
  const hofDBJSON = JSON.parse(
    readFileSync("./hofdb-2038e-firebase-adminsdk-jllij-4025146e4e.json"),
  );
  const firebaseConfig = {
    credential: cert(hofDBJSON),
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: "hofdb-2038e.firebaseapp.com",
    projectId: "hofdb-2038e",
    storageBucket: "hofdb-2038e.appspot.com",
    messagingSenderId: "78796187147",
    appId: "1:78796187147:web:aa89f01d66d63dfc5d490e",
    measurementId: "G-4T1D5KNQ7N",
  };
  return initializeApp(firebaseConfig);
}