const express = require("express");
const Cart = require("../models/Cart");
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
        const fields = ["trackId", "title", "category", "format"];
        for (const field of fields) {
            if (typeof body[field] !== "string" || !body[field].trim()) {
                return res.status(400).json({ message: "Track ID, title, genre, and format are required." });
            }
        }
        if (!validQuantity(body.quantity)) {
            return res.status(400).json({ message: "Quantity must be a positive whole number." });
        }
        if ((typeof body.price !== "number" && typeof body.price !== "string") ||
            String(body.price).trim() === "" || !Number.isFinite(Number(body.price)) || Number(body.price) < 0) {
            return res.status(400).json({ message: "Price must be a number of 0 or more." });
        }
        const cart = await Cart.findOne({ cartId: req.params.cartId });
        if (!cart) return res.status(404).json({ message: "Cart not found. Refresh the page." });

        const trackId = body.trackId.trim();
        const existing = cart.items.find(function(item) {
            return item.trackId.toLowerCase() === trackId.toLowerCase();
        });
        if (existing) {
            const quantity = existing.quantity + Number(body.quantity);
            if (!Number.isSafeInteger(quantity)) {
                return res.status(400).json({ message: "Quantity is too large." });
            }
            existing.quantity = quantity;
        } else {
            cart.items.push({
                trackId: trackId,
                title: body.title.trim(),
                category: body.category.trim(),
                format: body.format.trim(),
                price: Math.round(Number(body.price) * 100) / 100,
                info: typeof body.info === "string" ? body.info : "",
                quantity: Number(body.quantity)
            });
        }
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
