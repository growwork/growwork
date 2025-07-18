// backend/server.js

const express = require('express');
const path = require('path');
const fs = require('fs'); // <--- THIS WAS THE CRITICAL FIX

// Correctly load the .env file from the parent directory
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5001;

// --- Step 1: Build the Firebase Config object securely on the server ---
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
};

// Add a check to see if .env loaded correctly
if (!firebaseConfig.apiKey) {
    console.error("FATAL ERROR: Firebase API Key is missing. Check that your .env file is being loaded correctly.");
    process.exit(1); 
}

// --- Step 2: Set up path to the 'public' folder ---
const publicPath = path.join(__dirname, '../public');
console.log(`Serving static files from: ${publicPath}`);


// --- Step 3: Create a function to render and inject config into HTML ---
function renderHtmlWithConfig(filePath, res) {
    fs.readFile(filePath, 'utf8', (err, htmlData) => {
        if (err) {
            console.error(`Error reading HTML file: ${filePath}`, err);
            return res.status(404).send('Page not found');
        }

        const injectedConfig = JSON.stringify(firebaseConfig);

        let content = htmlData
            .replace(
                "const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};",
                `const firebaseConfig = ${injectedConfig};`
            )
            .replace(
                "const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';",
                `const appId = '${firebaseConfig.appId}';`
            )
            .replace(
                "if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token)",
                "if (false)"
            );

        res.header('Content-Type', 'text/html').send(content);
    });
}

// --- Step 4: Define routes for your pages (BEFORE static middleware) ---
app.get('/', (req, res) => {
    renderHtmlWithConfig(path.join(publicPath, 'Homepage.html'), res);
});

app.get('/*.html', (req, res) => {
    const filePath = path.join(publicPath, req.path);
    renderHtmlWithConfig(filePath, res);
});

// --- Step 5: Serve static assets AFTER dynamic routes ---
app.use(express.static(publicPath));


app.listen(PORT, () => {
    console.log(`✅ GrowWork server is running on http://localhost:${PORT}`);
});