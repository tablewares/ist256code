# SoundWave

IST 256 music storefront using Express, MongoDB, and Mongoose.
Frontend HTML, CSS, and JavaScript files are in `public/`.

## Run the project

1. Run `npm install`.
2. Copy `.env.example` to `.env` and enter the working MongoDB connection
   string as `MONGODB_URI`. Keep `.env` private.
3. Run `npm start`.
4. Open http://localhost:3000.

The server waits for MongoDB to connect before starting.

## Database functionality

- Products: add, retrieve, update, and delete catalog items.
- Shopping Cart: load saved items, add tracks, update quantities, and remove items.
- Billing and Shipping: save the submitted order and shipping address.
- Returns: save return requests.

Models are in `models/`. Cart item routes are in `routes/cart.js`;
other API routes are in `server.js`. The browser stores the cart ID,
and MongoDB stores the cart items.

## Import the original catalog (if needed)

Run `npm run seed:products` to import `products.json` using the original
`scripts/seedProducts.js`. This can update products with matching IDs,
so use it only when you intend to import that catalog.
