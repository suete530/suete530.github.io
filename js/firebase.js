import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

        const _k = atob("QUl6YVN5RGpOS3NBVG5ybjNncjN6VlpaMUl2WlRYLTBuY1J2UUVZ");

        export const firebaseConfig = {
            apiKey: _k,
            authDomain: "fines-system-7edd5.firebaseapp.com",
            projectId: "fines-system-7edd5",
            storageBucket: "fines-system-7edd5.firebasestorage.app",
            messagingSenderId: "514608325403",
            appId: "1:514608325403:web:0f300f0e43f803cdbee9be",
            measurementId: "G-33TH7LQNQS"
        };

        export const app = initializeApp(firebaseConfig);
        export const auth = getAuth(app);
        export const db = getFirestore(app);
