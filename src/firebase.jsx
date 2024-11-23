import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  // Add your own configuration key here
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
