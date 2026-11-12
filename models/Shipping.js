
const mongoose = require("mongoose");

const shippingSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        required: true,
        unique: true
    },
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    zipCode: {
        type: String,
        required: true
    },
    shippingStatus: {
        type: String,
        enum: ["Pending", "Processing", "Shipped", "Delivered"],
        default: "Pending"
    }
}, { timestamps: true });

const Shipping = mongoose.model("Shipping", shippingSchema, "shipping");

module.exports = Shipping;
