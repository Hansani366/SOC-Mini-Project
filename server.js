require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');

const Covid = require('./models/Covid');
const User = require('./models/User');
const Record = require('./models/Record');

const app = express();
app.use(cors());
app.use(express.json());

// ===== Session =====
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret_dev',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));
app.use(passport.initialize());
app.use(passport.session());

// ===== MongoDB Connect =====
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// ===== Passport Google OAuth2 =====
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = await User.create({
        googleId: profile.id,
        displayName: profile.displayName,
        email: profile.emails[0].value
      });
    }
    done(null, user);
  } catch (err) { done(err, null); }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try { const user = await User.findById(id); done(null, user); }
  catch (err) { done(err, null); }
});

// ===== Middlewares =====
const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  if (!apiKey) return res.status(401).json({ error: 'API key required' });
  if (apiKey !== process.env.API_KEY) return res.status(403).json({ error: 'Invalid API key' });
  next();
};

const verifyJwt = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Authorization Bearer token required' });
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // decoded.id available
    next();
  } catch (err) { return res.status(401).json({ error: 'Invalid or expired token' }); }
};

// ===== COVID Endpoint =====
app.get('/covid/:country', async (req, res) => {
  const country = req.params.country;
  try {
    let data = await Covid.findOne({ country });
    if (!data) {
      const response = await axios.get(`https://disease.sh/v3/covid-19/countries/${country}`);
      data = new Covid({
        country: response.data.country,
        cases: response.data.cases,
        deaths: response.data.deaths,
        recovered: response.data.recovered
      });
      await data.save();
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching data' });
  }
});

// ===== Records =====
app.post('/records', verifyApiKey, verifyJwt, async (req, res) => {
  try {
    const rec = new Record({ 
      user: req.user.id || req.user._id, 
      apiKeyUsed: req.headers['x-api-key'], 
      data: req.body 
    });
    await rec.save();
    res.json(rec);
  } catch (err) { 
    console.error("Save record error:", err);
    res.status(500).json({ error: 'Failed to save record' }); 
  }
});

app.get('/records', verifyApiKey, verifyJwt, async (req, res) => {
  try {
    const records = await Record.find({ user: req.user.id || req.user._id }).populate('user', 'displayName email').sort({ createdAt: -1 });
    res.json(records);
  } catch (err) { res.status(500).json({ error: 'Failed to load records' }); }
});

app.delete('/records', verifyApiKey, verifyJwt, async (req, res) => {
  try {
    await Record.deleteMany({ user: req.user.id || req.user._id });
    res.json({ message: 'Records cleared' });
  } catch (err) { res.status(500).json({ error: 'Failed to clear records' }); }
});

// ===== Dev JWT =====
if (process.env.NODE_ENV !== 'production') {
  app.get('/dev/generate-token', async (req, res) => {
    let user = await User.findOne();
    if (!user) user = await User.create({ googleId: 'dev', displayName: 'Dev User', email: 'dev@example.com' });
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.json({ token });
  });
}

// ===== Server =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
