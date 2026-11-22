const express = require("express");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const router = express.Router();

// Mounted at /api/cart in server.js after express.json().
// Whole-cart creation and retrieval remain in server.js.
function validQuantity(value) {
    return (typeof value === "number" || typeof value === "string") &&
        String(value).trim() !== "" &&
        Number.isSafeInteger(Number(value)) && Number(value) > 0;
}

async function saveCart(cart) {
    cart.itemCount = 0;
    let totalCents = 0;
    for (const item of cart.items) {
        cart.itemCount += item.quantity;
        totalCents += Math.round(item.price * 100) * item.quantity;
    }
    cart.total = totalCents / 100;
    await cart.save();
}

function sendError(res, error) {
    console.error("Cart item request failed:", error);
    const status = error.name === "ValidationError" ? 400 : 500;
    res.status(status).json({ message: status === 400
        ? "Invalid cart item data." : "Could not save your cart. Please try again." });
}

router.post("/:cartId/items", async (req, res) => {
    try {
        const body = req.body || {};
        if (typeof body.trackId !== "string" || !body.trackId.trim()) {
            return res.status(400).json({ message: "Track ID is required." });
        }
        if (!validQuantity(body.quantity)) {
            return res.status(400).json({ message: "Quantity must be a positive whole number." });
        }
        const cart = await Cart.findOne({ cartId: req.params.cartId });
        if (!cart) return res.status(404).json({ message: "Cart not found. Refresh the page." });

        const product = await Product.findOne({ productId: body.trackId.trim() });
        if (!product) return res.status(404).json({ message: "Product not found in the catalog." });

        const priceText = (product.price || "").trim();
        const price = Number(priceText);
        const priceCents = Math.round(price * 100);
        if (!priceText || price < 0 || !Number.isSafeInteger(priceCents)) {
            return res.status(400).json({ message: "This product does not have a valid price." });
        }

        const trackId = product.productId.trim();
        const title = (product.description || "").trim();
        const category = (product.category || "").trim();
        const format = (product.unitOfMeasure || "").trim();
        if (!trackId || !title || !category || !format) {
            return res.status(400).json({ message: "This product is missing required details." });
        }

        const existing = cart.items.find(function(item) {
            return item.trackId.toLowerCase() === trackId.toLowerCase();
        });
        const quantity = (existing ? existing.quantity : 0) + Number(body.quantity);
        if (!Number.isSafeInteger(quantity)) {
            return res.status(400).json({ message: "Quantity is too large." });
        }
        const item = {
            trackId,
            title,
            category,
            format,
            price: priceCents / 100,
            info: (product.weight || "").trim(),
            quantity
        };
        if (existing) Object.assign(existing, item);
        else cart.items.push(item);
        await saveCart(cart);
        res.status(201).json(cart);
    } catch (error) {
        sendError(res, error);
    }
});

router.put("/:cartId/items/:trackId", async (req, res) => {
    try {
        if (!validQuantity((req.body || {}).quantity)) {
            return res.status(400).json({ message: "Quantity must be a positive whole number." });
        }
        const cart = await Cart.findOne({ cartId: req.params.cartId });
        if (!cart) return res.status(404).json({ message: "Cart not found. Refresh the page." });
        const item = cart.items.find(function(item) { return item.trackId === req.params.trackId; });
        if (!item) return res.status(404).json({ message: "Track not found in cart." });
        item.quantity = Number(req.body.quantity);
        await saveCart(cart);
        res.json(cart);
    } catch (error) {
        sendError(res, error);
    }
});

router.delete("/:cartId/items/:trackId", async (req, res) => {
    try {
        const cart = await Cart.findOne({ cartId: req.params.cartId });
        if (!cart) return res.status(404).json({ message: "Cart not found. Refresh the page." });
        const index = cart.items.findIndex(function(item) { return item.trackId === req.params.trackId; });
        if (index === -1) return res.status(404).json({ message: "Track not found in cart." });
        cart.items.splice(index, 1);
        await saveCart(cart);
        res.json(cart);
    } catch (error) {
        sendError(res, error);
    }
});

router.delete("/:cartId/items", async (req, res) => {
    try {
        const cart = await Cart.findOne({ cartId: req.params.cartId });
        if (!cart) return res.status(404).json({ message: "Cart not found. Refresh the page." });
        cart.items = [];
        await saveCart(cart);
        res.json(cart);
    } catch (error) {
        sendError(res, error);
    }
});

module.exports = router;
