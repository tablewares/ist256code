
const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
    trackId: { type: String, required: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    format: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    info: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 }
});

const cartSchema = new mongoose.Schema({
    cartId: { type: String, required: true, unique: true },
    items: [cartItemSchema],
    itemCount: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
}, { timestamps: true });

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;
