
// Aidan: cart behavior and validation.
// Cart items are stored in MongoDB.
// The browser only stores the cart ID.

let cart = [];
let cartId = localStorage.getItem("soundwaveCartId");
let cartReady = false;
let cartSaving = false;

// Create a unique cart ID for this browser if one does not exist.
if (!cartId) {
    cartId = crypto.randomUUID();
    localStorage.setItem("soundwaveCartId", cartId);
}

function showCartMessage(text, type) {
    const message = document.getElementById("message");

    message.className = "alert alert-" + type;
    message.textContent = text;
}

function validQuantity(quantity) {
    const number = Number(quantity);
    return Number.isInteger(number) && number > 0;
}

// Load the cart from MongoDB when the page opens.
async function initializeCart() {
    try {
        let response = await fetch(
            "/api/cart/" + encodeURIComponent(cartId)
        );

        if (response.status === 404) {
            // Import any previously saved browser cart when creating
            // this browser's MongoDB cart for the first time.
            let oldItems = [];

            try {
                const savedItems = JSON.parse(
                    localStorage.getItem("soundwaveCartItems") || "[]"
                );

                if (Array.isArray(savedItems)) {
                    oldItems = savedItems;
                }
            } catch (error) {
                console.error("Could not read old cart:", error);
            }

            response = await fetch("/api/cart", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    cartId,
                    items: oldItems
                })
            });
        }

        if (!response.ok) {
            throw new Error("Could not load your cart.");
        }

        const data = await response.json();

        cart = Array.isArray(data.items) ? data.items : [];
        cartReady = true;

        // Remove the old browser-stored cart after successful migration.
        localStorage.removeItem("soundwaveCartItems");

        renderCart();

    } catch (error) {
        console.error("Could not load cart from MongoDB:", error);

        showCartMessage(
            "Your cart could not be loaded. Please refresh the page.",
            "danger"
        );
    }
}

// Only one cart change is sent at a time. Rendering never saves data.
async function changeCart(method, path, body, successMessage) {
    if (!cartReady || cartSaving) {
        showCartMessage("Please wait for your cart to finish loading or saving.", "warning");
        return false;
    }

    cartSaving = true;
    document.getElementById("checkoutBtn").disabled = true;
    showCartMessage("Saving cart...", "info");

    try {
        const response = await fetch(
            "/api/cart/" + encodeURIComponent(cartId) + "/items" + path,
            {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: body ? JSON.stringify(body) : undefined
            }
        );
        // An unmounted router can return an HTML 404 instead of JSON.
        const data = await response.json().catch(function() { return {}; });
        if (!response.ok) {
            throw new Error(data.message || "Could not save your cart. Check that the cart router is mounted and try again.");
        }
        if (!Array.isArray(data.items)) {
            throw new Error("The server returned an invalid cart. Refresh before continuing.");
        }

        cart = data.items;
        renderCart();
        showCartMessage(successMessage, "success");
        return true;
    } catch (error) {
        // Restore the last confirmed quantities if a request fails.
        renderCart();
        showCartMessage(error.message || "Could not save your cart. Please try again.", "danger");
        return false;
    } finally {
        cartSaving = false;
        document.getElementById("checkoutBtn").disabled = false;
    }
}

function validateCartTrack(track) {
    if (!track) return "Please select a track.";

    const requiredFields = ["trackId", "title", "category", "format"];

    for (let i = 0; i < requiredFields.length; i++) {
        const value = track[requiredFields[i]];

        if (typeof value !== "string" || value.trim() === "") {
            return "The track needs an ID, title, genre, and format.";
        }
    }

    if (
        (typeof track.price !== "number" && typeof track.price !== "string") ||
        String(track.price).trim() === "" ||
        !Number.isFinite(Number(track.price)) ||
        Number(track.price) < 0
    ) {
        return "This track needs a numeric price of 0 or more before it can be added.";
    }

    return "";
}

async function addToCart(track, quantity = 1) {
    const error = validateCartTrack(track);
    if (error !== "") {
        showCartMessage(error, "danger");
        return false;
    }
    if (!validQuantity(quantity)) {
        showCartMessage("Enter a whole-number quantity of 1 or more.", "danger");
        return false;
    }

    return changeCart("POST", "", {
        trackId: track.trackId.trim(),
        title: track.title.trim(),
        category: track.category.trim(),
        format: track.format.trim(),
        price: Math.round(Number(track.price) * 100) / 100,
        info: track.info || "",
        quantity: Number(quantity)
    }, "Track added to your cart.");
}

async function removeFromCart(trackId) {
    return changeCart("DELETE", "/" + encodeURIComponent(trackId), null,
        "Track removed from your cart.");
}

async function updateCartQuantity(trackId, quantity) {
    if (!validQuantity(quantity)) {
        showCartMessage(
            "Enter a whole-number quantity of 1 or more. Use Remove to delete a track.",
            "danger"
        );
        return false;
    }
    return changeCart("PUT", "/" + encodeURIComponent(trackId),
        { quantity: Number(quantity) }, "Quantity updated.");
}

function renderCart() {
    const cartBody = document.getElementById("cartBody");
    cartBody.textContent = "";

    let totalCents = 0;

    if (cart.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 4;
        cell.textContent = "Your cart is empty.";

        row.appendChild(cell);
        cartBody.appendChild(row);
    }

    cart.forEach(function(item) {
        const row = document.createElement("tr");

        const titleCell = document.createElement("td");
        titleCell.textContent = item.title + " (" + item.format + ")";
        row.appendChild(titleCell);

        const quantityCell = document.createElement("td");
        const input = document.createElement("input");

        input.type = "number";
        input.min = "1";
        input.step = "1";
        input.value = item.quantity;

        // Required for the jQuery update handler in cart.jquery.js.
        input.className = "form-control qty-input";
        input.setAttribute("data-track-id", item.trackId);
        input.setAttribute("aria-label", "Quantity for " + item.title);

        quantityCell.appendChild(input);
        row.appendChild(quantityCell);

        const lineCents = Math.round(item.price * 100) * item.quantity;
        totalCents += lineCents;

        const priceCell = document.createElement("td");
        priceCell.textContent =
            "$" + (lineCents / 100).toFixed(2) +
            " ($" + item.price.toFixed(2) + " each)";

        row.appendChild(priceCell);

        const buttonCell = document.createElement("td");
        const button = document.createElement("button");

        button.type = "button";
        button.className = "btn btn-outline-danger btn-sm remove-btn";
        button.textContent = "Remove";
        button.setAttribute("data-track-id", item.trackId);

        buttonCell.appendChild(button);
        row.appendChild(buttonCell);
        cartBody.appendChild(row);
    });

    document.getElementById("cartTotal").textContent =
        "$" + (totalCents / 100).toFixed(2);

}

function getCartItems() {
    const items = [];

    cart.forEach(function(item) {
        items.push({
            trackId: item.trackId,
            title: item.title,
            category: item.category,
            format: item.format,
            price: item.price,
            info: item.info,
            quantity: item.quantity
        });
    });

    return items;
}

document.getElementById("clearCartBtn").addEventListener("click", async function() {
    await changeCart("DELETE", "", null, "Cart cleared.");
});

// Load the MongoDB cart when the page opens.
initializeCart();
