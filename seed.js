/* =====================================================================
   seed.js  –  puts starting data into the five MongoDB collections
   Owner: Adam (database schema design / JSON data).

   Run it from the project folder, with MongoDB running:

       node seed.js            add the data (safe to run again: nothing gets duplicated)
       node seed.js --reset    empty the five collections first, then add the data

   What goes in:
     products       all of products.json (95 tracks; "N/A" prices are stored as null)
     shoppingcarts  1 sample cart  (the items from billing.sample.json)
     shippings      1 sample shipping record (from billing.sample.json)
     billings       billing.sample.json
     returns        returns.sample.json

   Running it twice: products are matched by productId and updated in place, and each of the other
   collections only gets its sample document when it is empty. The database address comes from
   MONGODB_URI (default: mongodb://127.0.0.1:27017/soundwave).
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const { mongoose, connectDatabase, Product, ShoppingCart, Shipping, Billing, Return } = require('./models');

const readJson = (name, folder) => JSON.parse(fs.readFileSync(path.join(folder, name), 'utf8'));

// Reads the JSON files and returns the documents for every collection. Touches no database.
function buildSeedDocuments(folder = __dirname) {
    const products = readJson('products.json', folder);
    const billing = readJson('billing.sample.json', folder);
    const returned = readJson('returns.sample.json', folder);

    const byId = {};
    products.forEach((p) => { byId[String(p.productId).trim()] = p; });

    const cart = {
        cartId: 'demo-cart',
        items: billing.order.items.map((item) => {
            const product = byId[item.productId] || {};
            return {
                trackId: item.productId,
                title: item.description,
                category: product.category || '',
                format: product.unitOfMeasure || '',
                price: item.unitPrice,
                info: product.weight || '',
                quantity: item.quantity
            };
        })
    };

    const shipping = {
        fullName: billing.customer.fullName,
        address: billing.billingAddress,
        method: billing.order.shipping.method,
        cost: billing.order.shipping.cost,
        cartId: cart.cartId
    };

    return { products, shoppingCarts: [cart], shippings: [shipping], billings: [billing], returns: [returned] };
}

// Checks every document against its schema before the database is touched.
async function checkSeedDocuments(docs) {
    const plan = [
        ['products', Product, docs.products], ['shoppingcarts', ShoppingCart, docs.shoppingCarts],
        ['shippings', Shipping, docs.shippings], ['billings', Billing, docs.billings], ['returns', Return, docs.returns]
    ];
    for (const [name, Model, list] of plan) {
        for (const doc of list) {
            try {
                await new Model(doc).validate();
            } catch (err) {
                throw new Error('A ' + name + ' document is not valid: ' + err.message);
            }
        }
    }
}

async function run({ reset = false, log = console.log, folder = __dirname } = {}) {
    const docs = buildSeedDocuments(folder);
    await checkSeedDocuments(docs);              // fail early, before anything is changed

    await connectDatabase();
    try {
        const others = [
            ['shoppingcarts', ShoppingCart, docs.shoppingCarts], ['shippings', Shipping, docs.shippings],
            ['billings', Billing, docs.billings], ['returns', Return, docs.returns]
        ];

        if (reset) {
            for (const Model of [Product, ShoppingCart, Shipping, Billing, Return]) {
                const result = await Model.deleteMany({});
                log('reset ' + Model.collection.name + ': removed ' + result.deletedCount + ' document(s)');
            }
        }

        // products: update in place by productId, add the ones that are missing
        const operations = docs.products.map((raw) => {
            const clean = new Product(raw).toObject();      // trims text and turns "N/A" prices into null
            delete clean._id;
            return { updateOne: { filter: { productId: clean.productId }, update: { $set: clean }, upsert: true } };
        });
        const written = await Product.bulkWrite(operations);
        log('products: ' + (written.upsertedCount || 0) + ' added, ' + (written.modifiedCount || 0) + ' updated, ' +
            (docs.products.length - (written.upsertedCount || 0) - (written.modifiedCount || 0)) + ' already up to date');

        // everything else: add the sample document only if the collection is empty
        for (const [name, Model, list] of others) {
            const existing = await Model.countDocuments();
            if (existing > 0) {
                log(name + ': already has ' + existing + ' document(s), left alone');
            } else {
                await Model.insertMany(list);
                log(name + ': added ' + list.length + ' sample document(s)');
            }
        }

        log('\nCollections now:');
        for (const Model of [Product, ShoppingCart, Shipping, Billing, Return]) {
            log('  ' + Model.collection.name.padEnd(14) + (await Model.countDocuments()));
        }
    } finally {
        await mongoose.disconnect();
    }
}

module.exports = { buildSeedDocuments, checkSeedDocuments, run };

if (require.main === module) {
    run({ reset: process.argv.includes('--reset') })
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('Seed failed: ' + err.message);
            process.exit(1);
        });
}
