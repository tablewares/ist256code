
const mongoose = require("mongoose");

const billingItemSchema = new mongoose.Schema({
    trackId: { type: String, required: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    format: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true }
});

const billingSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    cardName: { type: String, required: true },
    cardLastFour: { type: String },
    cardBrand: { type: String },
    items: [billingItemSchema],
    subtotal: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 4.99 },
    total: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("Billing", billingSchema, "billing");
