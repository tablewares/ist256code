/* =====================================================================
   cart.jquery.js  –  jQuery section (Shopping Cart page)
   Owner: Adam (jQuery + AJAX).  Cart rules/validation live in cart.js (Aidan).

   Responsibilities:
     1. Load the JSON product document (products.json)
     2. Live search the collection (title, artist, genre, format, ID)
     3. Render matches with an "Add" button that calls addToCart() from cart.js
     4. Show the cart as JSON, exactly as it will be sent
     5. AJAX POST the cart JSON to a RESTful API (/api/cart – built later)

   Depends on (loaded before this file): jQuery, cart.js
     cart.js globals used: addToCart(track, qty), getCartItems(), showCartMessage(text, type)
   ===================================================================== */
$(function () {
    var CATALOG_URL = 'products.json';
    var CART_API = '/api/cart';       // RESTful endpoint to be built in a later assignment
    var MAX_RESULTS = 20;             // keep the results table short; search narrows it
    var catalog = [];                 // normalized copy of products.json

    /* ---------- helpers ---------- */
    function esc(text) {
        return $('<div>').text(text == null ? '' : text).html();
    }

    function escRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Wrap each search term in <mark>. The text is escaped first, so this is safe.
    function highlight(text, terms) {
        var safe = esc(text);
        if (!terms.length) return safe;
        var pattern = $.map(terms, function (t) { return escRegex(esc(t)); }).join('|');
        return safe.replace(new RegExp('(' + pattern + ')', 'gi'), '<mark>$1</mark>');
    }

    function money(n) {
        return '$' + Number(n).toFixed(2);
    }

    function trim(value) {
        return value == null ? '' : String(value).trim();
    }

    /* ---------- 1. turn a products.json entry into a cart-ready track ----------
       products.json field   ->  cart.js track field
       productId             ->  trackId
       description           ->  title
       category              ->  category
       unitOfMeasure         ->  format
       price ("31.15 ")      ->  price (number)  – "N/A" becomes null = not for sale
       weight ("Artist-3:27")->  info            – artist is also pulled out for searching */
    function normalize(p) {
        var priceText = trim(p.price);
        var price = (priceText !== '' && isFinite(priceText)) ? Number(priceText) : null;

        var info = trim(p.weight);
        var artist = '';
        // Only treat "<artist>-<m:ss or N/A>" as artist data; plain weights like "0.45 kg" are left alone.
        var match = /^(.*\S)\s*-\s*(\d+:\d{2}|N\/A)$/.exec(info);
        if (match) artist = match[1];

        return {
            trackId: String(p.productId),
            title: trim(p.description),
            category: trim(p.category),
            format: trim(p.unitOfMeasure),
            price: price,
            info: info,
            artist: artist,
            haystack: [p.productId, p.description, artist, p.category, p.unitOfMeasure]
                .join(' ').toLowerCase()
        };
    }

    function loadCatalog() {
        $.ajax({ url: CATALOG_URL, dataType: 'json', cache: false })
            .done(function (data) {
                catalog = $.map(data, normalize);
                search();
            })
            .fail(function () {
                showCartMessage('Could not load products.json. Run the site from a web server (node server.js).', 'danger');
            });
    }

    /* ---------- 2. search ---------- */
    function search() {
        var terms = $.grep(trim($('#searchBox').val()).toLowerCase().split(/\s+/), Boolean);

        // every word typed must appear somewhere in the track (AND search)
        var matches = $.grep(catalog, function (t) {
            return terms.every(function (w) { return t.haystack.indexOf(w) > -1; });
        });

        matches.sort(function (a, b) { return a.title.localeCompare(b.title); });
        renderResults(matches, terms);
    }

    function renderResults(matches, terms) {
        var $body = $('#resultsBody').empty();
        var shown = matches.slice(0, MAX_RESULTS);

        if (!shown.length) {
            $body.append('<tr><td colspan="6" class="text-center text-muted py-4">No tracks match your search.</td></tr>');
        }

        $.each(shown, function (_, t) {
            var forSale = t.price !== null;
            var $row = $('<tr>').attr('data-id', t.trackId).html(
                '<td>' + highlight(t.trackId, terms) + '</td>' +
                '<td>' + highlight(t.title, terms) +
                    (t.artist ? '<div class="text-muted small">' + highlight(t.artist, terms) + '</div>' : '') +
                '</td>' +
                '<td>' + highlight(t.category, terms) + '</td>' +
                '<td>' + highlight(t.format, terms) + '</td>' +
                '<td>' + (forSale ? money(t.price) : '<span class="text-muted">Not priced</span>') + '</td>' +
                '<td class="text-end">' +
                    '<button type="button" class="btn btn-sm btn-dark add-btn"' +
                    (forSale ? '' : ' disabled title="No price listed for this track"') + '>Add</button>' +
                '</td>'
            );
            $body.append($row);
        });

        var count = matches.length, total = catalog.length;
        var text;
        if (count > MAX_RESULTS) {
            text = 'Showing the first ' + MAX_RESULTS + ' of ' + count + ' matches. Keep typing to narrow the list.';
        } else if (terms.length) {
            text = count + ' of ' + total + ' tracks match.';
        } else {
            text = total + ' tracks in the catalog.';
        }
        $('#resultCount').text(text);
    }

    $('#searchBox').on('input', search);

    /* ---------- 3. add to cart (cart.js does the validation and rendering) ---------- */
    $('#resultsBody').on('click', '.add-btn', function () {
        var $row = $(this).closest('tr');
        var id = String($row.data('id'));
        var track = $.grep(catalog, function (t) { return t.trackId === id; })[0];
        if (!track) return;

        var added = addToCart({
            trackId: track.trackId,
            title: track.title,
            category: track.category,
            format: track.format,
            price: track.price,
            info: track.info
        }, 1);

        if (added) {
            $row.addClass('table-success');
            setTimeout(function () { $row.removeClass('table-success'); }, 600);
        }
    });

    /* ---------- 4. cart as JSON ---------- */
    function buildPayload(items) {
        var totalCents = 0, units = 0;
        $.each(items, function (_, item) {
            totalCents += Math.round(item.price * 100) * item.quantity;
            units += item.quantity;
        });
        return { itemCount: units, total: totalCents / 100, items: items };
    }

    function updateCartJson() {
        $('#cartJson').text(JSON.stringify(buildPayload(getCartItems()), null, 2));
    }

    // cart.js redraws #cartBody whenever the cart changes, so watch it to keep the JSON in sync.
    new MutationObserver(updateCartJson).observe(document.getElementById('cartBody'),
        { childList: true, subtree: true });
    updateCartJson();

    /* ---------- 5. AJAX: send the cart JSON to the (future) RESTful API ---------- */
    $('#checkoutBtn').on('click', function () {
        var items = getCartItems();
        if (!items.length) {
            showCartMessage('Your cart is empty. Add at least one track before sending.', 'danger');
            return;
        }

        var payload = buildPayload(items);
        payload.submittedAt = new Date().toISOString();

        var $btn = $(this);
        var label = $btn.text();
        $btn.prop('disabled', true).text('Sending...');

        $.ajax({
            url: CART_API,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload)
        }).done(function () {
            showCartMessage('Cart sent to the API: ' + payload.itemCount + ' item(s), $' + payload.total.toFixed(2) + '.', 'success');
        }).fail(function (xhr) {
            if (xhr.status === 0 || xhr.status === 404) {
                // Expected for now: the RESTful API is a later assignment.
                showCartMessage('The cart JSON is ready, but the API (' + CART_API + ') is not available yet.', 'warning');
            } else {
                var msg = (xhr.responseJSON && xhr.responseJSON.message) || 'The API returned an error (' + xhr.status + ').';
                showCartMessage(msg, 'danger');
            }
        }).always(function () {
            $btn.prop('disabled', false).text(label);
        });
    });

    loadCatalog();
});
