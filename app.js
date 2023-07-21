// Dependencies
const express = require('express');
const mongoose = require('mongoose');
const validUrl = require('valid-url');
const shortid = require('shortid');

// Connect to MongoDB
mongoose.connect('mongodb://localhost/url_shortener_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// MongoDB Schema
const UrlSchema = new mongoose.Schema({
  shortUrl: { type: String, required: true, unique: true },
  longUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expirationDate: { type: Date },
});

const Url = mongoose.model('Url', UrlSchema);

// Express App
const app = express();
app.use(express.json());

// API 1: Shorten Url (Destination Url) → Short Url
app.post('/shorten', async (req, res) => {
  const { destinationUrl } = req.body;

  // Check if the URL is valid
  if (!validUrl.isWebUri(destinationUrl)) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    // Check if the destination URL already exists in the database
    let url = await Url.findOne({ longUrl: destinationUrl });
    if (!url) {
      // Create a new short URL
      const shortUrl = 'www.ppa.in/' + shortid.generate();
      url = new Url({ shortUrl, longUrl: destinationUrl });
      await url.save();
    }

    return res.json({ shortUrl: url.shortUrl });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// API 2: Update short url (Short Url, Destination Url) → Boolean
app.post('/update', async (req, res) => {
  const { shortUrl, destinationUrl } = req.body;

  // Check if the URL is valid
  if (!validUrl.isWebUri(destinationUrl)) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    // Update the destination URL for the given short URL
    const updatedUrl = await Url.findOneAndUpdate(
      { shortUrl },
      { longUrl: destinationUrl },
      { new: true }
    );

    if (!updatedUrl) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// API 3: Get Destination Url (Short Url) → Destination Url
app.get('/:shortUrl', async (req, res) => {
  const { shortUrl } = req.params;

  try {
    // Find the long URL for the given short URL
    const url = await Url.findOne({ shortUrl });

    if (!url) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    // Check if the link has expired
    if (url.expirationDate && url.expirationDate < Date.now()) {
      return res.status(410).json({ error: 'Short URL has expired' });
    }

    return res.redirect(url.longUrl);
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// API 4: Update Expiry (Short Url, Days to add in expiry) → Boolean
app.post('/update-expiry', async (req, res) => {
  const { shortUrl, daysToAdd } = req.body;

  try {
    // Find the URL entry
    const url = await Url.findOne({ shortUrl });

    if (!url) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    // Update the expiration date
    url.expirationDate = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);
    await url.save();

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start the server
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
