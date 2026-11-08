// Aidan: AngularJS billing validation. Demo only; no payment data is saved or sent.
var billingApp = angular.module("billingApp", []);

billingApp.controller("BillingController", function ($scope) {
    $scope.billing = {};
    $scope.errors = {};
    $scope.message = "";
    $scope.submitted = false;
    $scope.success = false;

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

        // Accept 13-19 digits, with optional spaces or hyphens between groups.
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

    // This is the form's only submission handler. AngularJS prevents navigation.
    $scope.submitBilling = function () {
        $scope.submitted = true;
        $scope.success = $scope.validateBilling();
        if ($scope.success) {
            $scope.message = "Your demo billing details passed validation. No payment has been processed and no information has been sent or saved.";
        } else {
            $scope.message = "Please correct the highlighted billing fields.";
        }
    };
});
