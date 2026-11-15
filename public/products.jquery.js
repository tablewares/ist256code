/* =====================================================================
   products.jquery.js  –  jQuery section (Product Management page)
   Responsibilities:
     1. Load the MongoDB catalog (GET /api/products)
     2. Render it as a table
     3. Live search + category filter + sort
     4. Update an existing entry (PUT) / add (POST) / delete (DELETE)
     5. Re-render so the screen always matches the saved database data
   ===================================================================== */
$(function () {
    var API = '/api/products';
    var products = [];        // in-memory copy of the API response
    var editingId = null;     // productId being edited, or null when adding
    var readOnly = false;     // true if the server isn't running

    var FIELDS = ['productId', 'description', 'category', 'unitOfMeasure', 'price', 'weight'];

    /* ---------- helpers ---------- */
    function esc(text) {
        return $('<div>').text(text == null ? '' : text).html();
    }

    function escRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Wrap matches of the search term in <mark> (text is escaped first)
    function highlight(text, term) {
        var safe = esc(text);
        if (!term) return safe;
        return safe.replace(new RegExp('(' + escRegex(esc(term)) + ')', 'gi'), '<mark>$1</mark>');
    }

    function money(n) {
        return String(n).trim() !== '' && isFinite(n) && Number(n) >= 0
            ? '$' + Number(n).toFixed(2) : 'Not priced';
    }

    function showStatus(type, message) {
        $('#statusMsg')
            .removeClass('d-none alert-success alert-danger alert-warning')
            .addClass('alert-' + type)
            .text(message)
            .hide().fadeIn(150)
            .delay(3000)
            .fadeOut(400);
    }

    /* ---------- load JSON ---------- */
    function loadProducts(flashId) {
        $.getJSON(API)
            .done(function (data) {
                readOnly = false;
                products = data;
                finishLoad(flashId);
            })
            .fail(function () {
                readOnly = true;
                showStatus('danger', 'Could not load products from MongoDB. Check the server and database connection, then refresh.');
            });
    }

    function finishLoad(flashId) {
        buildCategoryOptions();
        applyFilters();
        if (flashId) {
            $('#productBody tr').filter(function () { return $(this).attr('data-id') === String(flashId); }).addClass('row-flash');
        }
    }

    function buildCategoryOptions() {
        var $sel = $('#categoryFilter');
        var current = $sel.val();
        var cats = [];
        $.each(products, function (_, product) {
            if (cats.indexOf(product.category) === -1) cats.push(product.category);
        });
        cats.sort();
        $sel.find('option:gt(0)').remove();
        $.each(cats, function (_, c) {
            $sel.append($('<option>').val(c).text(c));
        });
        $sel.val(cats.indexOf(current) > -1 ? current : '');
    }

    /* ---------- search / filter / sort ---------- */
    function applyFilters() {
        var term = $.trim($('#searchInput').val());
        var cat = $('#categoryFilter').val();
        var sort = $('#sortSelect').val();
        var lower = term.toLowerCase();

        var list = $.grep(products, function (p) {
            if (cat && p.category !== cat) return false;
            if (!lower) return true;
            return [p.productId, p.description, p.category, p.unitOfMeasure, p.weight]
                .join(' ').toLowerCase().indexOf(lower) > -1;
        });

        list.sort(function (a, b) {
            switch (sort) {
                case 'description': return a.description.localeCompare(b.description);
                case 'priceAsc':    return a.price - b.price;
                case 'priceDesc':   return b.price - a.price;
                default:            return a.productId.localeCompare(b.productId);
            }
        });

        render(list, term);
    }

    function render(list, term) {
        var $body = $('#productBody').empty();

        if (!list.length) {
            $body.append('<tr><td colspan="7" class="text-center text-muted py-4">No items match your search.</td></tr>');
        }

        $.each(list, function (_, p) {
            var $row = $('<tr>').attr('data-id', p.productId).html(
                '<td class="fw-semibold">' + highlight(p.productId, term) + '</td>' +
                '<td>' + highlight(p.description, term) + '</td>' +
                '<td><span class="badge text-bg-light border">' + highlight(p.category, term) + '</span></td>' +
                '<td>' + highlight(p.unitOfMeasure, term) + '</td>' +
                '<td class="text-end">' + money(p.price) + '</td>' +
                '<td>' + (p.weight ? highlight(p.weight, term) : '<span class="text-muted">—</span>') + '</td>' +
                '<td class="text-end text-nowrap">' +
                    '<button type="button" class="btn btn-sm btn-outline-dark edit-btn">Edit</button> ' +
                    '<button type="button" class="btn btn-sm btn-outline-danger delete-btn">Delete</button>' +
                '</td>'
            );
            $body.append($row);
        });

        var n = list.length, total = products.length;
        $('#resultCount').text(n === total ? total + ' items' : n + ' of ' + total + ' items');
    }

    $('#searchInput').on('input', applyFilters);
    $('#categoryFilter, #sortSelect').on('change', applyFilters);
    $('#clearSearchBtn').on('click', function () {
        $('#searchInput').val('').trigger('input').focus();
        $('#categoryFilter').val('').trigger('change');
    });

    /* ---------- edit: copy a row into the form ---------- */
    $('#productBody').on('click', '.edit-btn', function () {
        var id = String($(this).closest('tr').attr('data-id'));
        var p = $.grep(products, function (x) { return String(x.productId) === id; })[0];
        if (!p) return;

        $.each(FIELDS, function (_, f) { $('#' + f).val(p[f]); });
        editingId = id;
        $('#productId').prop('readonly', true);
        $('#formTitle').text('Update item ' + id);
        $('#saveBtn').text('Update Item');
        $('#cancelEditBtn').removeClass('d-none');
        $('#productForm').removeClass('was-validated');
        $('html, body').animate({ scrollTop: $('#productForm').offset().top - 100 }, 250);
        $('#description').focus();
    });

    function resetForm() {
        editingId = null;
        $('#productForm')[0].reset();
        $('#productForm').removeClass('was-validated');
        $('#productId').prop('readonly', false);
        $('#formTitle').text('Add a new item');
        $('#saveBtn').text('Add Item');
        $('#cancelEditBtn').addClass('d-none');
    }
    $('#cancelEditBtn').on('click', resetForm);

    /* ---------- add / update (POST or PUT) ---------- */
    $('#productForm').on('submit', function (e) {
        e.preventDefault();
        var form = this;

        // Basic Bootstrap validation; the JavaScript teammate's validator can replace this.
        if (typeof window.validateProductForm === 'function' ? !window.validateProductForm(form) : !form.checkValidity()) {
            $(form).addClass('was-validated');
            return;
        }
        $(form).addClass('was-validated');

        if (readOnly) {
            showStatus('warning', 'Server not running – changes cannot be saved.');
            return;
        }

        var item = {};
        $.each(FIELDS, function (_, f) { item[f] = $.trim($('#' + f).val()); });
        item.price = parseFloat(item.price);

        var updating = editingId !== null;

        $.ajax({
            url: updating ? API + '/' + encodeURIComponent(editingId) : API,
            method: updating ? 'PUT' : 'POST',
            contentType: 'application/json',
            data: JSON.stringify(item)
        }).done(function () {
            showStatus('success', (updating ? 'Updated ' : 'Added ') + item.productId + ' – MongoDB updated.');
            resetForm();
            loadProducts(item.productId);
        }).fail(function (xhr) {
            var msg = (xhr.responseJSON && xhr.responseJSON.message) || 'Save failed.';
            if (xhr.status === 409) {
                $('#productId').addClass('is-invalid').next('.invalid-feedback').text(msg);
            }
            showStatus('danger', msg);
        });
    });

    /* ---------- delete ---------- */
    $('#productBody').on('click', '.delete-btn', function () {
        var $row = $(this).closest('tr');
        var id = String($row.attr('data-id'));
        if (readOnly) return showStatus('warning', 'Server not running – changes cannot be saved.');
        if (!window.confirm('Delete ' + id + '?')) return;

        $.ajax({ url: API + '/' + encodeURIComponent(id), method: 'DELETE' })
            .done(function () {
                $row.fadeOut(200, function () {
                    if (editingId === id) resetForm();
                    loadProducts();
                });
                showStatus('success', 'Deleted ' + id + ' – MongoDB updated.');
            })
            .fail(function () { showStatus('danger', 'Delete failed.'); });
    });

    loadProducts();
});
