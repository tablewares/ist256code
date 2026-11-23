/* =====================================================================
   returns.jquery.js  –  jQuery section (Returns page)
   Owner: Adam (jQuery).  Load order: AngularJS, returns.js, jQuery, then this file.

   What it does:
     1. Loads the product catalog from the backend (GET /api/products, which reads MongoDB)
     2. Replaces the three sample cards in #productList with real products
     3. Searches the catalog live as the customer types in #productSearch
        (title, artist, genre, format or ID; every word typed must match)
     4. When a product is selected, gives it to the AngularJS controller
        ($scope.returnDetails.product), so returns.js validates and submits it

   If the catalog cannot be loaded, the three sample cards stay and the page still works.
   Also available to other code: window.ReturnSearch.find(query) and .lookup(productId)
   ===================================================================== */
$(function () {
    var $search = $('#productSearch');
    var $list = $('#productList');
    if (!$search.length || !$list.length) return;       // not the Returns page

    var CATALOG_URL = '/api/products';
    var MAX_RESULTS = 12;                // cards shown at once; keep typing to narrow the list
    var catalog = [];                    // simplified copy of the products
    var selectedId = '';                 // the product the customer picked

    var $count = $('#productCount');
    if (!$count.length) {
        $count = $('<p class="text-muted small mb-2" id="productCount"></p>').insertBefore($list);
    }

    /* ---------- helpers ---------- */
    function clean(value) {
        return value == null ? '' : String(value).trim();
    }

    function esc(value) {
        return $('<div>').text(value == null ? '' : value).html();
    }

    function escRegex(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Wrap each search word in <mark>. The text is escaped first, so this is safe.
    function highlight(value, words) {
        var safe = esc(value);
        if (!words.length) return safe;
        var pattern = $.map(words, function (w) { return escRegex(esc(w)); }).join('|');
        return safe.replace(new RegExp('(' + pattern + ')', 'gi'), '<mark>$1</mark>');
    }

    function money(n) {
        return '$' + Number(n).toFixed(2);
    }

    // The artist is stored inside "weight", like "Olivia Rodrigo-3:27".
    function artistOf(weight) {
        var match = /^(.*\S)\s*-\s*(\d+:\d{2}|N\/A)$/.exec(clean(weight));
        return match ? match[1] : '';
    }

    // Works with a price that is a number, a string like "31.15 ", "N/A" or null.
    function normalize(p) {
        var priceText = clean(p.price);
        return {
            productId: clean(p.productId),
            productName: clean(p.description),
            category: clean(p.category),
            format: clean(p.unitOfMeasure),
            price: (priceText !== '' && isFinite(priceText)) ? Number(priceText) : null,
            artist: artistOf(p.weight)
        };
    }

    function haystack(product) {
        return [product.productId, product.productName, product.artist, product.category, product.format]
            .join(' ').toLowerCase();
    }

    /* ---------- 1. load the catalog ---------- */
    function load() {
        $.getJSON(CATALOG_URL)
            .done(function (data) {
                catalog = $.map(data, function (p) {
                    var product = normalize(p);
                    return { product: product, text: haystack(product) };
                });
                catalog.sort(function (a, b) { return a.product.productName.localeCompare(b.product.productName); });
                render();
            })
            .fail(function () {
                $count.text('The product list could not be loaded, so sample products are shown. Start the server with node server.js.');
            });
    }

    /* ---------- 3. search ---------- */
    function wordsOf(query) {
        return $.grep(clean(query).toLowerCase().split(/\s+/), Boolean);
    }

    function find(query) {
        var words = wordsOf(query);
        return $.map($.grep(catalog, function (entry) {
            return words.every(function (w) { return entry.text.indexOf(w) > -1; });
        }), function (entry) { return $.extend({}, entry.product); });
    }

    function lookup(productId) {
        var id = clean(productId);
        var hit = $.grep(catalog, function (entry) { return entry.product.productId === id; })[0];
        return hit ? $.extend({}, hit.product) : null;
    }

    /* ---------- 2. show product cards (same look as the sample cards in returns.html) ---------- */
    function cardHtml(p, words) {
        var returnable = p.price !== null;       // an item with no price cannot be refunded
        var domId = 'product-' + p.productId.replace(/[^\w-]/g, '_');
        var details = [p.artist, p.category, p.format].filter(Boolean).join(' · ');
        return '' +
            '<div class="card return-product-card mb-3' + (p.productId === selectedId ? ' border-primary' : '') + '" data-product-name="' + esc(p.productName) + '">' +
              '<div class="card-body"><div class="row align-items-center">' +
                '<div class="col-md-3 text-center">' +
                  '<img src="https://placehold.co/150x120?text=' + encodeURIComponent(p.format || 'Music') + '" alt="' + esc(p.format || 'Product') + ' placeholder" class="img-fluid rounded">' +
                '</div>' +
                '<div class="col-md-6">' +
                  '<h5>' + highlight(p.productName, words) + '</h5>' +
                  '<p class="text-muted mb-1">' + highlight(details, words) + '</p>' +
                  '<p class="fw-bold mb-0">' + (returnable ? money(p.price) : '<span class="text-muted fw-normal">Not priced (cannot be returned)</span>') + '</p>' +
                '</div>' +
                '<div class="col-md-3 text-md-end">' +
                  '<input class="form-check-input product-select" type="radio" name="productId" id="' + domId + '" value="' + esc(p.productId) + '"' +
                    (p.productId === selectedId ? ' checked' : '') + (returnable ? '' : ' disabled') + '>' +
                  '<label class="form-check-label ms-1" for="' + domId + '">Select</label>' +
                '</div>' +
              '</div></div>' +
            '</div>';
    }

    function render() {
        var words = wordsOf($search.val());
        var matches = find($search.val());
        var shown = matches.slice(0, MAX_RESULTS);

        // keep the picked product on screen even when a newer search no longer matches it
        if (selectedId && !$.grep(shown, function (p) { return p.productId === selectedId; }).length) {
            var picked = lookup(selectedId);
            if (picked) shown.unshift(picked);
        }

        $list.empty();
        if (!shown.length) {
            $list.append('<p class="text-center text-muted py-4">No products match your search.</p>');
        }
        $.each(shown, function (_, p) { $list.append(cardHtml(p, words)); });

        if (matches.length > MAX_RESULTS) {
            $count.text('Showing the first ' + MAX_RESULTS + ' of ' + matches.length + ' matches. Keep typing to narrow the list.');
        } else if (words.length) {
            $count.text(matches.length + ' of ' + catalog.length + ' products match.');
        } else {
            $count.text(catalog.length + ' products. Type to search.');
        }
    }

    $search.on('input', render);

    /* ---------- 4. hand the selected product to AngularJS ---------- */
    function angularScope() {
        var el = document.querySelector('[ng-controller="ReturnsController"]');
        return el && window.angular ? window.angular.element(el).scope() : null;
    }

    $list.on('change', 'input[name="productId"]', function () {
        var product = lookup($(this).val());
        if (!product || product.price === null) return;

        selectedId = product.productId;
        $list.find('.return-product-card').removeClass('border-primary');
        $(this).closest('.return-product-card').addClass('border-primary');

        var scope = angularScope();
        if (scope) {
            scope.$apply(function () {
                scope.returnDetails.productId = product.productId;
                scope.returnDetails.product = product;       // returns.js reads this
                scope.returnChanged();                       // clears old messages, re-checks if already submitted
            });
        }
    });

    window.ReturnSearch = { find: find, lookup: lookup };

    load();
});
