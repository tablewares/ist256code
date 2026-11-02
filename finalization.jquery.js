/* =====================================================================
   finalization.jquery.js  –  jQuery section (Event Registration page)
   Owner: Adam (jQuery + JSON).  Load order: jQuery, finalization.js, this file.

   Responsibilities:
     1. Load the existing product catalog (products.json) with $.getJSON
     2. Fill the "Featured Track" menu from it
     3. Live-search that menu as the user types (title, artist, genre, format, ID)
     4. After a registration is saved, show the saved JSON document on the page
        (finalization.js announces it with a "registration:saved" event)
   ===================================================================== */
$(function () {
    var $search = $('#trackSearch');
    var $select = $('#featuredTrack');
    var $count = $('#trackCount');
    var tracks = [];                          // simplified copy of products.json

    /* ---------- helpers ---------- */
    // products.json stores the artist inside "weight", like "Olivia Rodrigo-3:27".
    // Plain weights such as "0.45 kg" have no artist.
    function artistOf(weight) {
        var match = /^(.*\S)\s*-\s*(\d+:\d{2}|N\/A)$/.exec(String(weight == null ? '' : weight).trim());
        return match ? match[1] : '';
    }

    function clean(value) {
        return value == null ? '' : String(value).trim();
    }

    /* ---------- 1. load products.json ---------- */
    function loadTracks() {
        $.getJSON('products.json')
            .done(function (data) {
                tracks = $.map(data, function (p) {
                    var artist = artistOf(p.weight);
                    var title = clean(p.description);
                    return {
                        id: clean(p.productId),
                        label: artist ? title + ' – ' + artist : title,
                        haystack: [p.productId, title, artist, p.category, p.unitOfMeasure].join(' ').toLowerCase()
                    };
                });
                tracks.sort(function (a, b) { return a.label.localeCompare(b.label); });
                renderOptions();
            })
            .fail(function () {
                $count.text('Track list unavailable: could not load products.json.');
            });
    }

    /* ---------- 2 + 3. fill and filter the menu ---------- */
    function renderOptions() {
        var words = $.grep(clean($search.val()).toLowerCase().split(/\s+/), Boolean);
        var keep = $select.val();            // keep the user's pick while they keep searching

        var matches = $.grep(tracks, function (t) {
            return t.id === keep || words.every(function (w) { return t.haystack.indexOf(w) > -1; });
        });

        $select.empty().append($('<option>').val('').text('No featured track'));
        $.each(matches, function (_, t) {
            $select.append($('<option>').val(t.id).text(t.label));
        });
        $select.val(keep || '');

        var shown = $select.find('option').length - 1;
        $count.text(words.length ? shown + ' of ' + tracks.length + ' tracks match.' : tracks.length + ' tracks available.');
    }

    $search.on('input', renderOptions);

    // form.reset() clears the search box but not the filtered menu, so redraw it afterwards.
    $('#eventRegistrationForm').on('reset', function () {
        setTimeout(renderOptions, 0);
    });

    /* ---------- 4. show the saved JSON document ---------- */
    $(document).on('registration:saved', function (event) {
        var doc = event.originalEvent.detail;
        $('#savedJson').text(JSON.stringify(doc, null, 2));
        $('#savedJsonBox').removeClass('d-none').hide().fadeIn(200);
    });

    loadTracks();
});
