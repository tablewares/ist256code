const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));


app.post('/api/signup', (req, res) => {
  const userData = req.body;
  let existingData = [];
  const filePath = path.join(__dirname, 'user_data.json');

  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    try {
      existingData = JSON.parse(fileContent);
      if (!Array.isArray(existingData)) {
        existingData = [existingData]; // Convert to array if it was a single object
      }
    } catch (err) {
      existingData = [];
    }
  }

  existingData.push(userData);
  fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));

  res.status(200).json({ message: 'data saved' });
});

//  tracks endpoints 

const tracksFilePath = path.join(__dirname, 'tracks.json');

// helper function to read tracks from tracks.json
const getTracks = () => {
  if (!fs.existsSync(tracksFilePath)) return [];
  try {
    const fileContent = fs.readFileSync(tracksFilePath, 'utf8');
    const data = JSON.parse(fileContent);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return [];
  }
};


// get all tracks
app.get('/api/tracks', (req, res) => {
  const tracks = getTracks();
  res.status(200).json(tracks);
});

//  products endpoints (used by products.html / products.jquery.js)

const productsFilePath = path.join(__dirname, 'products.json');

const SEED_PRODUCTS = [
  { productId: 'SW-1001', description: 'Midnight Echoes – Vinyl', category: 'Alternative', unitOfMeasure: 'Vinyl', price: 29.99, weight: '0.45 kg' },
  { productId: 'SW-1002', description: 'Neon Highways – CD', category: 'Pop', unitOfMeasure: 'CD', price: 14.99, weight: '0.10 kg' },
  { productId: 'SW-1003', description: 'Back Road Stories – Cassette', category: 'Country', unitOfMeasure: 'Cassette', price: 9.99, weight: '0.05 kg' },
  { productId: 'SW-1004', description: 'City Lights – Digital Download', category: 'Hip-Hop', unitOfMeasure: 'Digital Download', price: 9.49, weight: '' }
];

const getProducts = () => {
  if (!fs.existsSync(productsFilePath)) {
    saveProducts(SEED_PRODUCTS);   // create products.json on first run
    return SEED_PRODUCTS.slice();
  }
  try {
    const data = JSON.parse(fs.readFileSync(productsFilePath, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return [];
  }
};

// write to a temp file then rename so a crash can't leave a half-written products.json
const saveProducts = (products) => {
  const tmp = productsFilePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(products, null, 2));
  fs.renameSync(tmp, productsFilePath);
};

// Validate/clean a product body. Returns { error } or { item }.
const cleanProduct = (body) => {
  body = body || {};
  const str = (v) => (v == null ? '' : String(v).trim());
  const item = {
    productId: str(body.productId),
    description: str(body.description),
    category: str(body.category),
    unitOfMeasure: str(body.unitOfMeasure),
    price: typeof body.price === 'number' ? body.price : parseFloat(body.price),
    weight: str(body.weight)
  };
  if (!/^[A-Za-z0-9-]{3,20}$/.test(item.productId)) {
    return { error: 'Product ID must be 3–20 letters, numbers or dashes.' };
  }
  if (!item.description) return { error: 'Description is required.' };
  if (!item.category) return { error: 'Category is required.' };
  if (!item.unitOfMeasure) return { error: 'Unit of measure is required.' };
  if (!Number.isFinite(item.price) || item.price < 0) {
    return { error: 'Price must be a number of 0 or more.' };
  }
  item.price = Math.round(item.price * 100) / 100;
  return { item };
};

const sameId = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

// get all products
app.get('/api/products', (req, res) => {
  res.status(200).json(getProducts());
});

// get one product
app.get('/api/products/:id', (req, res) => {
  const product = getProducts().find((p) => sameId(p.productId, req.params.id));
  if (!product) return res.status(404).json({ message: `Product ${req.params.id} not found.` });
  res.status(200).json(product);
});

// add a product
app.post('/api/products', (req, res) => {
  const { error, item } = cleanProduct(req.body);
  if (error) return res.status(400).json({ message: error });

  const products = getProducts();
  if (products.some((p) => sameId(p.productId, item.productId))) {
    return res.status(409).json({ message: `Product ID ${item.productId} already exists.` });
  }

  products.push(item);
  saveProducts(products);
  res.status(201).json(item);
});

// update a product (the ID in the URL wins; the ID can't be changed)
app.put('/api/products/:id', (req, res) => {
  const products = getProducts();
  const index = products.findIndex((p) => sameId(p.productId, req.params.id));
  if (index === -1) return res.status(404).json({ message: `Product ${req.params.id} not found.` });

  const { error, item } = cleanProduct({ ...req.body, productId: products[index].productId });
  if (error) return res.status(400).json({ message: error });

  products[index] = item;
  saveProducts(products);
  res.status(200).json(item);
});

// delete a product
app.delete('/api/products/:id', (req, res) => {
  const products = getProducts();
  const index = products.findIndex((p) => sameId(p.productId, req.params.id));
  if (index === -1) return res.status(404).json({ message: `Product ${req.params.id} not found.` });

  products.splice(index, 1);
  saveProducts(products);
  res.status(200).json({ message: 'deleted' });
});

// malformed JSON bodies -> clean 400 instead of an HTML error page
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON.' });
  }
  next(err);
});

//  event registration endpoint (used by finalization.html / finalization.js)
//
//  The form sends flat values. This route checks them, builds the JSON document below,
//  and stores it in registrations.json:
//    {
//      "registrationId": "REG-1A2B3C4D",
//      "event": "SoundWave Live",
//      "registeredAt": "2026-11-01T18:30:00.000Z",
//      "contact": { "fullName": "...", "email": "..." },
//      "options": {
//        "ticketType": "vip", "attendanceType": "in-person", "session": "live-music",
//        "favoriteGenre": "rock",
//        "featuredTrack": { "productId": "5", "title": "Stupid Song" },   (or null)
//        "specialRequests": "...", "receiveUpdates": true
//      }
//    }
//  If an option is added to a <select> in finalization.html, add its value to REGISTRATION_CHOICES.

const crypto = require('crypto');
const REGISTRATIONS_FILE = path.join(__dirname, 'registrations.json');
const EVENT_NAME = 'SoundWave Live';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;   // same rule as finalization.js

const REGISTRATION_CHOICES = {
  ticketType: ['general', 'vip'],
  attendance: ['in-person', 'virtual'],
  session: ['opening', 'artist-panel', 'live-music', 'music-production'],
  favoriteGenre: ['pop', 'hip-hop', 'rock', 'country', 'r-and-b', 'alternative', 'other']
};

const oneLine = (v) => (v == null ? '' : String(v).trim().replace(/\s+/g, ' '));

// Check the flat form values. Returns { errors } (a list of { field, message }) or { doc }.
const cleanRegistration = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: [{ field: 'body', message: 'Send the registration as a JSON object.' }] };
  }

  const errors = [];
  const fail = (field, message) => errors.push({ field, message });

  const fullName = oneLine(body.fullName);
  const email = oneLine(body.email).toLowerCase();
  if (!fullName) fail('fullName', 'Full name is required.');
  else if (fullName.length > 100) fail('fullName', 'Full name must be 100 characters or fewer.');
  if (!EMAIL_PATTERN.test(email) || email.length > 254) fail('email', 'A valid email address is required.');

  const choice = {};
  const labels = { ticketType: 'ticket type', attendance: 'attendance type', session: 'event session', favoriteGenre: 'favorite genre' };
  Object.keys(REGISTRATION_CHOICES).forEach((key) => {
    choice[key] = oneLine(body[key]);
    if (!REGISTRATION_CHOICES[key].includes(choice[key])) fail(key, `Choose a valid ${labels[key]}.`);
  });

  // Optional featured track: must be a real item in products.json (the title is copied from there).
  let featuredTrack = null;
  const trackId = oneLine(body.featuredTrack);
  if (trackId) {
    const product = getProducts().find((p) => String(p.productId) === trackId);
    if (!product) fail('featuredTrack', 'Choose a track from the catalog.');
    else featuredTrack = { productId: String(product.productId), title: oneLine(product.description) };
  }

  // Notes keep their line breaks; only stray spaces and tabs are tidied.
  const specialRequests = body.specialRequests == null ? '' :
    String(body.specialRequests).replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').trim();
  if (specialRequests.length > 500) fail('specialRequests', 'Special requests must be 500 characters or fewer.');

  if (errors.length) return { errors };

  return {
    doc: {
      registrationId: 'REG-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
      event: EVENT_NAME,
      registeredAt: new Date().toISOString(),
      contact: { fullName, email },
      options: {
        ticketType: choice.ticketType,
        attendanceType: choice.attendance,
        session: choice.session,
        favoriteGenre: choice.favoriteGenre,
        featuredTrack,
        specialRequests,
        receiveUpdates: ['yes', 'true', 'on'].includes(String(body.updates).toLowerCase()) || body.updates === true
      }
    }
  };
};

// A missing file just means no registrations yet. A file that exists but can't be parsed
// is reported instead of being overwritten, so saved registrations are never wiped out.
const readRegistrations = () => {
  if (!fs.existsSync(REGISTRATIONS_FILE)) return [];
  const data = JSON.parse(fs.readFileSync(REGISTRATIONS_FILE, 'utf8'));
  if (!Array.isArray(data)) throw new Error('registrations.json is not a JSON array.');
  return data;
};

// write to a temp file then rename so a crash can't leave a half-written registrations.json
const writeRegistrations = (registrations) => {
  const tmp = REGISTRATIONS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(registrations, null, 2));
  fs.renameSync(tmp, REGISTRATIONS_FILE);
};

app.post('/api/register', (req, res) => {
  const { errors, doc } = cleanRegistration(req.body);
  if (errors) {
    return res.status(400).json({ success: false, message: errors[0].message, errors });
  }

  try {
    const registrations = readRegistrations();
    registrations.push(doc);
    writeRegistrations(registrations);
  } catch (err) {
    console.error('error saving registration:', err);
    return res.status(500).json({ success: false, message: 'The server could not save your registration. Please try again.' });
  }

  res.status(201).json({ success: true, message: 'Registration successful!', data: doc });
});

const DATA_FILE = path.join(__dirname, 'billings.json');
const SHIPPING_COST = 4.99;

const cardBrand = (number) => {
  if (/^4/.test(number)) return 'visa';
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(number)) return 'mastercard';
  if (/^3[47]/.test(number)) return 'amex';
  if (/^(6011|65|64[4-9])/.test(number)) return 'discover';
  return 'unknown';
};

app.post('/api/billing', (req, res) => {
  const items = Array.isArray(req.body && req.body.items) ? req.body.items : [];
  if (!items.length) {
    return res.status(400).json({ success: false, message: 'Add items to your cart before submitting billing.' });
  }

  const billingData = req.body || {};
  const cardNumber = String(billingData.cardNumber || '').replace(/[ -]/g, '');
  const expiration = /^(\d{2})\/(\d{2})$/.exec(billingData.expirationDate || '');
  const orderItems = items.map((item) => {
    const unitPrice = Math.round(Number(item.price) * 100) / 100;
    return {
      productId: String(item.trackId),
      description: item.title,
      unitPrice,
      quantity: Number(item.quantity),
      lineTotal: Math.round(unitPrice * Number(item.quantity) * 100) / 100
    };
  });
  const subtotalCents = orderItems.reduce((sum, item) => sum + Math.round(item.lineTotal * 100), 0);
  const subtotal = subtotalCents / 100;
  const doc = {
    createdAt: new Date().toISOString(),
    customer: { fullName: billingData.fullName || '' },
    billingAddress: {
      street: billingData.address || '',
      city: billingData.city || '',
      state: billingData.state || '',
      zip: billingData.zipCode || ''
    },
    payment: {
      method: 'credit-card',
      cardBrand: cardBrand(cardNumber),
      cardLast4: cardNumber.slice(-4),
      expMonth: expiration ? Number(expiration[1]) : 0,
      expYear: expiration ? 2000 + Number(expiration[2]) : 0
    },
    order: {
      items: orderItems,
      itemCount: orderItems.reduce((count, item) => count + item.quantity, 0),
      subtotal,
      shipping: { method: 'standard', cost: SHIPPING_COST },
      total: Math.round((subtotal + SHIPPING_COST) * 100) / 100
    }
  };

  try {
    const records = fs.existsSync(DATA_FILE)
      ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
      : [];
    if (!Array.isArray(records)) throw new Error('billings.json is not a JSON array.');
    records.push(doc);
    fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2));
  } catch (err) {
    console.error('error saving billing data:', err);
    return res.status(500).json({ success: false, message: 'Failed to save billing data.' });
  }

  res.status(201).json({
    success: true,
    message: 'Billing details successfully saved.',
    data: doc
  });
});

// start Server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});