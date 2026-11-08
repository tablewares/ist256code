// Aidan: AngularJS billing validation. Demo only; the API saves the order summary.
var billingApp = angular.module("billingApp", []);

billingApp.controller("BillingController", function ($scope, $http) {
    $scope.billing = {};
    $scope.errors = {};
    $scope.message = "";
    $scope.submitted = false;
    $scope.success = false;
    $scope.cartItems = [];
    $scope.shippingCost = 4.99;

    try {
        var savedItems = JSON.parse(localStorage.getItem("soundwaveCartItems") || "[]");
        if (Array.isArray(savedItems)) {
            $scope.cartItems = savedItems;
        }
    } catch (error) {
        console.error("Could not load cart items saved in this browser:", error);
    }

    $scope.cartSubtotal = function () {
        return $scope.cartItems.reduce(function (sum, item) {
            return sum + Math.round(Number(item.price) * 100) * Number(item.quantity);
        }, 0) / 100;
    };

    $scope.cartTotal = function () {
        return $scope.cartSubtotal() + $scope.shippingCost;
    };

    $scope.validateBilling = function () {
        var billing = $scope.billing;
        $scope.errors = {};
        var requiredFields = ["fullName", "email", "address", "city", "state", "zipCode", "cardName"];
        for (var i = 0; i < requiredFields.length; i++) {
            var field = requiredFields[i];
            if (!billing[field] || billing[field].trim() === "") {
                $scope.errors[field] = "This field is required.";
            }
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billing.email || "")) {
            $scope.errors.email = "Enter a valid email address.";
        }
        if (!/^\d{5}(-\d{4})?$/.test(billing.zipCode || "")) {
            $scope.errors.zipCode = "Enter a 5-digit ZIP code or ZIP+4.";
        }

        var cardNumber = billing.cardNumber || "";
        var digits = cardNumber.replace(/[ -]/g, "");
        if (!/^\d+(?:[ -]\d+)*$/.test(cardNumber) || !/^\d{13,19}$/.test(digits)) {
            $scope.errors.cardNumber = "Enter 13-19 demo card digits; spaces or hyphens may separate groups.";
        }

        var expiration = billing.expirationDate || "";
        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiration)) {
            $scope.errors.expirationDate = "Use MM/YY with a month from 01 to 12.";
        } else {
            var month = Number(expiration.substring(0, 2));
            var year = 2000 + Number(expiration.substring(3, 5));
            var today = new Date();
            if (year < today.getFullYear() ||
                (year === today.getFullYear() && month < today.getMonth() + 1)) {
                $scope.errors.expirationDate = "Enter the current month or a future expiration date.";
            }
        }
        if (!/^\d{3,4}$/.test(billing.securityCode || "")) {
            $scope.errors.securityCode = "Enter a 3- or 4-digit demo security code.";
        }

        for (var error in $scope.errors) {
            return false;
        }
        return true;
    };

    $scope.billingChanged = function () {
        $scope.success = false;
        $scope.message = "";
        if ($scope.submitted) {
            $scope.validateBilling();
        }
    };

    $scope.cardLastFour = function () {
        var digits = ($scope.billing.cardNumber || "").replace(/[ -]/g, "");
        if (/^\d{13,19}$/.test(digits)) {
            return digits.slice(-4);
        }
        return "";
    };

    // Updated submission handler with $http call
    $scope.submitBilling = function () {
        $scope.submitted = true;
        if (!$scope.cartItems.length) {
            $scope.success = false;
            $scope.message = "Your cart is empty. Add items before submitting billing.";
            return;
        }
        var isValid = $scope.validateBilling();

        if (isValid) {
            $scope.message = "Validating and saving...";
            
            // Send data to the Node.js API endpoint
            var billingSubmission = angular.copy($scope.billing);
            billingSubmission.items = $scope.cartItems;
            $http.post('/api/billing', billingSubmission)
                .then(function (response) {
                    $scope.success = true;
                    $scope.message = response.data.message || "Billing details saved successfully!";
                    // Optionally reset form: $scope.billing = {}; $scope.submitted = false;
                })
                .catch(function (error) {
                    $scope.success = false;
                    $scope.message = "Server error: Could not save billing details. Please try again.";
                    console.error("Submission error:", error);
                });
        } else {
            $scope.success = false;
            $scope.message = "Please correct the highlighted billing fields.";
        }
    };
});