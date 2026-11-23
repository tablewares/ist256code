/* =====================================================================
   models.js  –  MongoDB collections (Mongoose schemas) for the SoundWave store
   Owner: Adam (database schema design).

   Five collections, each shaped like the JSON the pages already produce:

     products       <- products.json / the Manage Tracks page      (Product)
     shoppingcarts  <- the cart saved by cart.js                    (ShoppingCart)
     shippings      <- shipping method + address chosen at billing  (Shipping)
     billings       <- billings.json / the Billing Details page     (Billing)
     returns        <- the Returns page form                        (Return)

   How the Node teammate uses this file (server.js stays in the project root, not in /public):

     const { connectDatabase, Product, ShoppingCart, Shipping, Billing, Return } = require('./models');
     connectDatabase().then(() => app.listen(PORT, ...)).catch(err => { console.error(err.message); process.exit(1); });

     const products = await Product.find().sort({ description: 1 }).lean();     // GET    /api/products
     const saved    = await Billing.create(doc);                                 // POST   /api/billing
     await Return.findByIdAndUpdate(id, { status: 'approved' }, { runValidators: true, new: true });   // PUT
     await ShoppingCart.findOneAndDelete({ cartId });                             // DELETE

   Safety notes:
     - Billing has NO field for a full card number or security code. Mongoose drops any field that is
       not in the schema, so those values can never be saved even if a request contains them.
     - The database address comes from the MONGODB_URI environment variable (an Atlas link works too).
       connectDatabase() never prints the address, because it can contain a password.
   ===================================================================== */
const mongoose = require('mongoose');
const { Schema } = mongoose;

const DEFAULT_URI = 'mongodb://127.0.0.1:27017/soundwave';

// Values on the Returns form (returns.html). If an option is added there, add it here too.
const RETURN_REASONS = ['damaged', 'defective', 'wrong-item', 'unwanted', 'other'];
const RETURN_CONDITIONS = ['new', 'opened', 'used', 'damaged'];
const RETURN_STATUSES = ['received', 'approved', 'rejected'];
const SHIPPING_METHODS = ['standard', 'expedited'];
const CARD_BRANDS = ['visa', 'mastercard', 'amex', 'discover', 'unknown'];

/* ---------- small helpers ---------- */
const isWholeNumber = {
    validator: Number.isInteger,
    message: '{PATH} must be a whole number.'
};

// products.json has prices like "31.15 " (with a space) and "N/A". The database keeps a real
// number, or null when there is no price on file, so the pages can always do math on it.
function toPrice(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
        const text = value.trim();
        if (text === '' || !isFinite(text)) return null;
        value = Number(text);
    }
    return typeof value === 'number' && isFinite(value) ? Math.round(value * 100) / 100 : value;
}

const money = { type: Number, min: [0, '{PATH} cannot be negative.'] };
const requiredText = (max) => ({ type: String, required: [true, '{PATH} is required.'], trim: true, maxlength: max });
const optionalText = (max) => ({ type: String, trim: true, maxlength: max, default: '' });

const addressFields = {
    street: requiredText(100),
    city: requiredText(100),
    state: requiredText(50),       // the billing form accepts a state name or abbreviation
    zip: requiredText(10)
};

/* =====================================================================
   1. Product   (collection: products)
   ===================================================================== */
const productSchema = new Schema({
    productId: { type: String, required: [true, 'productId is required.'], unique: true, trim: true },
    description: requiredText(200),
    category: optionalText(60),
    unitOfMeasure: optionalText(40),          // the format: Vinyl, CD, Digital, ...
    price: { type: Number, min: [0, 'price cannot be negative.'], default: null, set: toPrice },
    weight: optionalText(100)                 // holds "Artist-3:27" style text for music tracks
}, { collection: 'products', versionKey: false });

/* =====================================================================
   2. ShoppingCart   (collection: shoppingcarts)
   One document per browser. There is no login, so the page makes up a cartId and keeps it.
   The item fields use the same names as cart.js, so the saved cart array can be stored as is.
   ===================================================================== */
const cartItemSchema = new Schema({
    trackId: requiredText(40),
    title: requiredText(200),
    category: optionalText(60),
    format: optionalText(40),
    price: Object.assign({ required: [true, 'price is required.'] }, money),
    info: optionalText(100),
    quantity: { type: Number, required: true, min: 1, max: 99, validate: isWholeNumber }
}, { _id: false });

const shoppingCartSchema = new Schema({
    cartId: { type: String, required: [true, 'cartId is required.'], unique: true, trim: true, maxlength: 64 },
    items: { type: [cartItemSchema], default: [] }
}, { collection: 'shoppingcarts', timestamps: true, versionKey: false });

/* =====================================================================
   3. Shipping   (collection: shippings)
   ===================================================================== */
const shippingSchema = new Schema({
    fullName: requiredText(100),
    address: { type: new Schema(addressFields, { _id: false }), required: true },
    method: { type: String, enum: SHIPPING_METHODS, default: 'standard' },
    cost: Object.assign({ required: true }, money),
    cartId: optionalText(64),
    createdAt: { type: Date, default: Date.now }
}, { collection: 'shippings', versionKey: false });

/* =====================================================================
   4. Billing   (collection: billings)  –  same shape as billings.json / billing.sample.json
   ===================================================================== */
const orderItemSchema = new Schema({
    productId: requiredText(40),
    description: requiredText(200),
    unitPrice: Object.assign({ required: true }, money),
    quantity: { type: Number, required: true, min: 1, max: 99, validate: isWholeNumber },
    lineTotal: Object.assign({ required: true }, money)
}, { _id: false });

const billingSchema = new Schema({
    schemaVersion: { type: Number, default: 1 },
    createdAt: { type: Date, default: Date.now },
    customer: { type: new Schema({ fullName: requiredText(100) }, { _id: false }), required: true },
    billingAddress: { type: new Schema(addressFields, { _id: false }), required: true },
    payment: {
        type: new Schema({
            method: { type: String, enum: ['credit-card'], default: 'credit-card' },
            cardBrand: { type: String, enum: CARD_BRANDS, required: true },
            cardLast4: { type: String, required: true, match: [/^\d{4}$/, 'cardLast4 must be exactly 4 digits.'] },
            expMonth: { type: Number, required: true, min: 1, max: 12, validate: isWholeNumber },
            expYear: { type: Number, required: true, min: 2000, max: 2100, validate: isWholeNumber }
        }, { _id: false }),
        required: true
    },
    order: {
        type: new Schema({
            items: {
                type: [orderItemSchema],
                validate: { validator: (items) => items.length > 0, message: 'An order needs at least one item.' }
            },
            itemCount: { type: Number, required: true, min: 1 },
            subtotal: Object.assign({ required: true }, money),
            shipping: new Schema({
                method: { type: String, enum: SHIPPING_METHODS, default: 'standard' },
                cost: Object.assign({ required: true }, money)
            }, { _id: false }),
            total: Object.assign({ required: true }, money)
        }, { _id: false }),
        required: true
    }
}, { collection: 'billings', versionKey: false });

/* =====================================================================
   5. Return   (collection: returns)  –  one product per request, like the Returns form
   ===================================================================== */
const returnSchema = new Schema({
    orderNumber: requiredText(40),
    product: {
        type: new Schema({
            productId: requiredText(40),
            productName: requiredText(200),
            category: optionalText(60),
            format: optionalText(40),
            price: Object.assign({ required: true }, money)
        }, { _id: false }),
        required: true
    },
    reason: { type: String, enum: { values: RETURN_REASONS, message: 'Choose a reason from the list.' }, required: [true, 'reason is required.'] },
    condition: { type: String, enum: { values: RETURN_CONDITIONS, message: 'Choose a condition from the list.' }, required: [true, 'condition is required.'] },
    comments: optionalText(500),
    status: { type: String, enum: RETURN_STATUSES, default: 'received' },
    createdAt: { type: Date, default: Date.now }
}, { collection: 'returns', versionKey: false });

/* ---------- models + connection ---------- */
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
const ShoppingCart = mongoose.models.ShoppingCart || mongoose.model('ShoppingCart', shoppingCartSchema);
const Shipping = mongoose.models.Shipping || mongoose.model('Shipping', shippingSchema);
const Billing = mongoose.models.Billing || mongoose.model('Billing', billingSchema);
const Return = mongoose.models.Return || mongoose.model('Return', returnSchema);

async function connectDatabase(uri) {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri || process.env.MONGODB_URI || DEFAULT_URI, { serverSelectionTimeoutMS: 5000 });
    const c = mongoose.connection;
    console.log('MongoDB connected: database "' + c.name + '" on ' + c.host + ':' + c.port);
    return c;
}

module.exports = {
    mongoose, connectDatabase, DEFAULT_URI,
    Product, ShoppingCart, Shipping, Billing, Return,
    RETURN_REASONS, RETURN_CONDITIONS, RETURN_STATUSES, SHIPPING_METHODS
};
