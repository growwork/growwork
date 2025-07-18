import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD4e8QdrgT4p0Qlq4yKmMz8iUtd6ZqGFgg",
  authDomain: "growwork-8e32e.firebaseapp.com",
  projectId: "growwork-8e32e",
  storageBucket: "growwork-8e32e.appspot.com",
  messagingSenderId: "74310023008",
  appId: "1:74310023008:web:91f90c971fd8ba0a851005"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const adminEmail = "deepak.loomsberries@gmail.com";
