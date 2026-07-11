const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.resolve(__dirname, '../config/firebase-service-account.json');

if (fs.existsSync(serviceAccountPath)) {
    try {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin initialized.');
    } catch (error) {
        console.error('Firebase Admin initialization failed:', error.message);
        console.error('Push notifications will be disabled until a valid Service Account Key is provided.');
    }
} else {
    console.error('Firebase Service Account Key not found at:', serviceAccountPath);
    console.error('Push notifications will be disabled.');
}

module.exports = admin;
