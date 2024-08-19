const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');
const nodemailer = require('nodemailer');
require('dotenv').config();


const app = express();

app.use(express.json());
app.use(cors({
    origin: 'http://127.0.0.1:5500', // Update to your frontend origin
    credentials: true
}));

mongoose.connect('mongodb+srv://gvwelkin:123@cluster0.fhhod.mongodb.net/')
    .then(() => {
        console.log('Database connected');
    })
    .catch(error => {
        console.error('Error connecting to database:', error);
    });

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    points: {
        type: Number,
        required: true,
        default: 0
    }
});

const giveawayEntrySchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    }
});

const User = mongoose.model('User', userSchema , 'signins');
const GiveawayEntry = mongoose.model('GiveawayEntry', giveawayEntrySchema , 'giveaways');

const users = {};

/*const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'genshinimpact89659@gmail.com', // Your email
        pass: 'genshin4'   // Your email password
    }
});*/

/*const generateToken = () => {
    return crypto.randomBytes(20).toString('hex');
};*/

/*const sendVerificationEmail = (email, token) => {
    const verificationUrl = `http://localhost:3000/verify-email?token=${token}`;
    
    const mailOptions = {
        from: 'genshinimpact89659@gmail.com',
        to: email,
        subject: 'Email Verification',
        text: `Please click the following link to verify your email address: ${verificationUrl}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending verification email:', error);
        } else {
            console.log('Verification email sent:', info.response);
        }
    });
};*/

/*const checkEmailExistence = (email) => {
    return new Promise((resolve, reject) => {
        const domain = email.split('@')[1];
        dns.resolveMx(domain, (err, addresses) => {
            if (err || addresses.length === 0) {
                return resolve(false);
            }
            return resolve(true);
        });
    });
};*/

// Signup Endpoint
app.post('/signup', async (req, res) => {
    const { name, email, username, password } = req.body;
    try {
        // Validate email format strictly for xyz@gmail.com
        const emailRegex = /^[^\s@]+@gmail\.com$/;
        if (!emailRegex.test(email)) {
            return res.status(400).send('Invalid email format. Only emails ending with @gmail.com are allowed.');
        }

        // Check if the email domain has MX records to verify its existence
        //const emailDomainValid = await checkEmailDomain(email);
        //if (!emailDomainValid) {
            //return res.status(401).send('The email domain does not exist.');
        //}

        // Check if email already exists in the database
        /*const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).send('Email already exists. Please use a different email.');
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).send('Username already exists. Please choose a different username.');
        }*/

        // Hash the password before saving it to the database
        //const hashedPassword = await bcrypt.hash(password, 10);

        // Generate a verification token
        //const token = generateToken();

        const newUser = new User({
            name,
            email,
            username,
            password,
            points:0
        });

        await newUser.save();
        const userId = newUser._id.toString();
        users[userId] = newUser;

        // Send verification email
       // sendVerificationEmail(email, token);

        return res.json({ message: 'Signup successful. Please verify your email address.', userId });
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).send('Error inserting data');
    }
});

// Email Verification Endpoint
app.get('/verify-email', async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).send('Invalid token.');
    }

    try {
        // Find the user with the matching token
        const user = await User.findOne({ emailVerificationToken: token });

        if (!user) {
            return res.status(400).send('Invalid token or user not found.');
        }

        // Verify the email and clear the token
        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        await user.save();

        res.send('Email verified successfully. You can now log in.');
    } catch (error) {
        console.error('Error verifying email:', error);
        res.status(500).send('Error verifying email');
    }
});


// Login Endpoint
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user || password !== user.password) {
            return res.status(400).send('Incorrect username or password');
        }

        // Create a unique session identifier or use user ID
        const userId = user._id.toString();
        users[userId] = user; // Track user data

        res.json({ message: 'Login successful', userId }); // Return userId or session token
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Error during login');
    }
});

// Entry Endpoint
app.get('/entry', async (req, res) => {
    const { userId } = req.query;

    console.log('Received userId:', userId); // Log the received userId

    if (!userId) {
        return res.status(400).json({ error: 'UserId is required' });
    }

    if (!users[userId]) {
        console.log('User not found in users object:', userId); // Log if userId is not in users
        return res.status(404).json({ error: 'User not found' });
    }
    try {
        const user = users[userId];

        user.points++;
        await User.findByIdAndUpdate(user._id, { points: user.points });

        res.json({ points: user.points});
    } catch (error) {
        console.error('Error accessing entry:', error);
        res.status(500).send('Error accessing entry');
    }
});

// Giveaway Endpoint
app.get('/giveaway', async (req, res) => {
    const { userId } = req.query;

    console.log('Received userId:', userId); // Log the received userId

    if (!userId) {
        return res.status(400).json({ error: 'UserId is required' });
    }

    if (!users[userId]) {
        console.log('User not found in users object:', userId); // Log if userId is not in users
        return res.status(404).json({ error: 'User not found' });
    }

    try {
        const user = users[userId];

        if (!user.points || user.points <= 0) {
            console.log('Not enough points for user:', userId); // Log if not enough points
            return res.status(400).json({ error: 'Not enough points' });
        }

        // Deduct points
        user.points--;
        await User.findByIdAndUpdate(user._id, { points: user.points });

        // Save entry in giveaway collection
        const newEntry = new GiveawayEntry({ username: user.username });
        await newEntry.save();

        res.json({ message: 'Entry successful' });
    } catch (error) {
        console.error('Error accessing giveaway:', error);
        res.status(500).json({ error: 'Error accessing giveaway' });
    }
});


// Points Endpoint
app.get('/points', (req, res) => {
    const { userId } = req.query; // Get userId from query parameters
    if (!userId || !users[userId]) {
        return res.status(404).json({ error: 'User not found' });
    }

    res.json({ points: users[userId].points });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
