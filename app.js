// Import dependencies
require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const cors = require('cors');  
const path = require('path');
const admin = require('firebase-admin'); 

// Initialize Firebase Admin SDK using environment variables
const serviceAccount = require(path.join(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT_KEY));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL  
});

// Get reference to the Firebase Realtime Database
const db = admin.database();

// Initialize express app
const app = express();
app.use(express.static(__dirname)); // Serve files from the root directory

// Enable CORS for all routes
app.use(cors());

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Login route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Query Firebase Realtime Database for the user by email
        const userRef = db.ref('users').orderByChild('email').equalTo(email);
        const snapshot = await userRef.once('value');
        
        if (snapshot.exists()) {
            const user = snapshot.val();  // Get user data
            const userId = Object.keys(user)[0]; // Get the user key
            const isMatch = await bcrypt.compare(password, user[userId].password);  // Check if password matches

            if (isMatch) {
                return res.status(200).json({ message: 'Login successful!' });
            } else {
                return res.status(401).json({ message: 'Invalid password' });
            }
        } else {
            return res.status(404).json({ message: 'User not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Sign-up route
app.post('/signup', async (req, res) => {
    const { email, password } = req.body; // Get email and password from the request body

    // Log the incoming data for debugging
    console.log(req.body); // Check the incoming request body

    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide all fields' });
    }

    try {
        // Query Firebase Realtime Database to check if the user already exists
        const userRef = db.ref('users').orderByChild('email').equalTo(email);
        const snapshot = await userRef.once('value');

        if (snapshot.exists()) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Add the new user to Firebase Realtime Database
        const newUserRef = db.ref('users').push();  // Generate a new unique key for the user
        await newUserRef.set({
            email,
            password: hashedPassword
        });

        res.status(201).json({ message: 'User created successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'loading.html')); // Adjust to your main HTML file
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});