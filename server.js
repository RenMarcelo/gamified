// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const sgMail = require('@sendgrid/mail');
const app = express();
const bcrypt = require('bcrypt');
const mongodb = require('mongodb');
const session = require('express-session')
const MongoStore = require('connect-mongo')
const rateLimit = require('express-rate-limit')
const helmet = require('helmet')
const validator = require('validator')
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use (express.static(__dirname + "/public"))
app.use('/node_modules', express.static("node_modules"))
app.use(helmet())

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017'
const client = new mongodb.MongoClient(mongoUri)
let userCollection;

async function connectToDatabase() {
    try {
        await client.connect()
        console.log("Connected to MongoDB")
        const database = client.db("renz")
        userCollection = database.collection("users")
    } catch (error) {
        console.error("Failed to connect to MongoDB", error)
        process.exit(1)
    }
}

connectToDatabase()

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({mongoUrl: mongoUri}),
    cookie: {
        secure: false,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 30 * 60 * 1000
    }
}))

const loginLimiter = rateLimit({
    windowsMs: 30 * 60 * 1000,
    max: 5,
    message: "Too many login attempts, please try again after 30 minutes",
    handler: function (req, res, next, options) {
        res.status(options.statusCode).json({success: false, message: options.message})
    }
})

function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function hashPassword(password) {
    const saltRounds = 10
    return bcrypt.hashSync(password, saltRounds)
}

function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).json({success: false, message: "Unauthorized Access"})
    }
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

sgMail.setApiKey(process.env.SENDGRID_API_KEY); // ung API

app.get('/dashboard', isAuthenticated, (req, res) => {
    res.sendFile(__dirname + "/public/dashboard.html")
})

app.get("/user-details", isAuthenticated, async (req, res) => {
    try {
        const email = req.session.email
        if (!email) {
            return res.status(401).json({success: false, message: "Unauthorized Access"})
        }

        const user = await userCollection.findOne(
            {email: email},
            {projection: {email: 1, highscore: 1}}
        )

        if (!user) {
            return res.status(404).json({success: false, message: "User not found"})
        }
        
        const all_users = await userCollection.find(
            {},
            {projection: {email: 1, highscore: 1}}
        ).toArray()

        res.json({
            success: true,
            user: {email: user.email, highscore: user.highscore},
            users: all_users
        })
    } catch (error) {
        console.error("Error fetching user details:", error)
        res.status(500).json({success: false, message: "Error fetching user details"})
    }
})

app.get("/get_score", async (req, res) => {
    try {
        const email = req.session.email
        console.log(email)
        if (!email) {
            return res.status(401).json({success: false, message: "Unauthorized Access"})
        }

        const user = await userCollection.findOne(
            {email: email},
            {projection: {email: 1}}
        )

        if (!user) {
            return res.status(404).json({success: false, message: "User not found"})
        }

        res.json({success: true, user: {email: user.email}})
    } catch (error) {
        console.error("Error fetching user details:", error)
        res.status(500).json({success: false, message: "Error fetching user details"})
    }
})

app.post("/save_score", async (req, res) => {
    const {email, score} = req.body

    const user = await userCollection.findOne({email: email})
    if (!user) {
        return res.status(400).json({success: false, message: "ERROR in EMAIL"})
    }

    if (!("highscore" in user)) {
        await userCollection.updateOne(
            {_id: user._id},
            {$set: {highscore: score}}
        )
    }

    if (score > user.highscore) {
        await userCollection.updateOne(
            {_id: user._id},
            {$set: {highscore: score}}
        )
    }

    res.json({success: true})
})

app.post("/logout", async (req, res) => {
    if (!req.session.userId) {
        return res.status(400).json({success: false, message: "No user is logged in."})
    }

    try {
        req.session.destroy(err => {
            if (err) {
                console.error("Error destroying session", err)
                return res.status(500).json({success: false, message: "Logout failed"})
            }

            res.clearCookie('connect.sid')

            return res.json({success: true, message: "Logged out successfully"})
        })
    } catch (error) {
        console.error('Error during logout:', error)
        return res.status(500).json({success: false, message: "Failed to log out."})
    }
})

app.post("/login", loginLimiter, async (req, res) => {
    const {email, password} = req.body;

    const user = await userCollection.findOne({email: email})
    if (!user) {
        return res.json({success: false, message: "Email is not registered"})
    }

    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
        const remainingTime = Math.ceil((user.accountLockedUntil - new Date()) / 60000)
        return res.json({success: false, message: `Account is locked. Try again in ${remainingTime} minutes.`})
    }

    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
        let invalidAttempts = (user.invalidLoginAttempts || 0) + 1
        let updateFields = {invalidLoginAttempts: invalidAttempts}
        if (invalidAttempts >= 3) {
            updateFields.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000)
            updateFields.invalidLoginAttempts = 0
            await userCollection.updateOne({_id: user._id}, {$set: updateFields})

            return res.json({success: false, message: "Account is locked due to multiple failed login attempts. Please try again after 30 minutes."})
        } else {
            await userCollection.updateOne({_id: user._id}, {$set: updateFields})
            return res.json({success: false, message: "Invalid Password"})
        }
    }

    await userCollection.updateOne(
        {_id: user._id},
        {$set: {invalidAttempts: 0, accountLockedUntil: null, lasLoginTime: new Date()}}
    )

    req.session.userId = user._id
    req.session.email = user.email
    req.session.role = user.role
    req.session.studentIDNumber = user.studentIDNumber

    await new Promise((resolve, reject) => {
        req.session.save((error) => {
            if (error) return reject(error)
            resolve()
        })
    })
    res.json({success: true, role: user.role, message: "Login Successful."})
})

app.post("/user_signup", async (req, res) => {
    const {new_email, new_password} = req.body
    try {
        const existingUser = await userCollection.findOne({email: new_email})
        if (existingUser) {
            return res.status(400).json({success: false, message: 'Email already registered'})
        }

        const hashed_password = hashPassword(new_password)
        const newUser = {
            email: new_email,
            token: null,
            password: hashed_password,
            createdAt: new Date()
        }
        const insertResult = await userCollection.insertOne(newUser)

        if (insertResult.acknowledged) {
            res.json({success: true, message: 'Account created successfully!'})
        } else {
            res.status(500).json({success: false, message: 'Failed to create account'})
        }
    } catch (error) {
        res.status(500).json({success: false, message: "An internal server error" + error})
    }
})

app.post('/reset-password', async (req, res) => {
    const {input_token, new_password} = req.body;
    try {
        const user = await userCollection.findOne({
            token: input_token,
            createdAt: {$gt: new Date()}
        })
        if (!user) {    
            res.status(400).json({success: false, message: 'Invalid or Expired Token.'})
            return
        }
        
        const hashed_password = hashPassword(new_password)
        const update_mongo = await userCollection.updateOne(
            {_id: user._id},
            {
                $set: {
                    password: hashed_password,
                    token: null,
                    createdAt: null
                }
            }
        )
        if (update_mongo.modifiedCount == 1) {
            res.json({success: true, message: "Your password has been successfully reset."})
        } else {
            res.status(500).json({success: false, message: "Password reset failed."})
        }
    } catch (error) {
        console.error("Error resseting password: ", error)
    }

})

app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).send('Email is required')
    }
    
    try {
        const resetToken = generateRandomString(32)

        const user = await userCollection.findOne({email: email})
        if (user) {
            const updateResult = await userCollection.updateOne(
                {email: email},
                {
                    $set: {
                        token : resetToken,
                        createdAt: new Date(Date.now() + 3600000)}
                }
            )
            const msg = {
                to: email,
                from: 'rheinzmarcelo10@gmail.com', // Replace with your verified sender email
                subject: 'Password Reset Request',
                text: `Your password reset token is: ${resetToken}`,
                html: `<p>Your password reset token is:</p><h3>${resetToken}</h3>`,
            };
            sgMail.send(msg).then(() => {
                res.status(400).send("Email sent successfully.")    
            })
        } else {
            res.status(400).send("Email is not registered.")
        }
    } catch (error) {
        res.status(500).send('Error finding or updating token ' + error)
    }
});