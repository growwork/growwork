// backend/server.js

const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Important: Load .env from the root

const app = express();
const PORT = process.env.PORT || 5001;

// Your secret Firebase configuration and App ID from the .env file
const firebaseConfig = process.env.FIREBASE_CONFIG;
const appId = process.env.APP_ID;

if (!firebaseConfig || !appId) {
    console.error("FATAL ERROR: FIREBASE_CONFIG or APP_ID is not defined in your .env file.");
    process.exit(1);
}

// Path to your public folder containing HTML files
const publicPath = path.join(__dirname, '../public');

// Serve static assets like images or CSS if you add them later
app.use(express.static(publicPath));

// This is the core logic: handle every request
app.get('*', (req, res) => {
    // Determine which HTML file to send. Defaults to the login page for the root path.
    let pageName = 'login-signup-page.html'; // Default page
    if (req.path !== '/') {
        pageName = req.path.substring(1); // Get filename from URL, e.g., /User_profile_page.html -> User_profile_page.html
    }

    const filePath = path.join(publicPath, pageName);

    // Read the requested HTML file from disk
    fs.readFile(filePath, 'utf8', (err, htmlData) => {
        if (err) {
            // If the file doesn't exist, send a 404 Not Found error
            return res.status(404).send(`Page not found: ${pageName}`);
        }

        // --- DYNAMIC INJECTION OF FIREBASE CONFIG ---
        // This is where we securely inject the config into the HTML before sending it to the user.
        let content = htmlData.replace(
            "typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};",
            `${firebaseConfig};`
        );
        content = content.replace(
            "typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';",
            `'${appId}';`
        );
         content = content.replace(
            "typeof __initial_auth_token !== 'undefined' && __initial_auth_token",
            "false" // We will handle authentication on the client-side
        );
        
        // Send the modified HTML to the user's browser
        res.header('Content-Type', 'text/html');
        res.send(content);
    });
});

app.listen(PORT, () => {
    console.log(`GrowWork server is now running on http://localhost:${PORT}`);
    console.log(`Serving files from: ${publicPath}`);
});