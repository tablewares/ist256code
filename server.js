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

// Start Server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});