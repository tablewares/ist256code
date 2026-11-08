// Aidan: AngularJS return validation. No request is saved or sent.
var returnsApp = angular.module("returnsApp", []);

returnsApp.controller("ReturnsController", function ($scope) {
    $scope.returnDetails = {};
    $scope.errors = {};
    $scope.message = "";
    $scope.submitted = false;
    $scope.success = false;

    $scope.productName = function () {
        if ($scope.returnDetails.productId === "headphones") {
            return "SoundWave Headphones";
        } else if ($scope.returnDetails.productId === "speaker") {
            return "SoundWave Speaker";
        } else if ($scope.returnDetails.productId === "vinyl") {
            return "SoundWave Vinyl Record";
        }
        return "";
    };

    $scope.reasonLabel = function () {
        var reason = $scope.returnDetails.returnReason;
        if (reason === "damaged") {
            return "Item arrived damaged";
        } else if (reason === "defective") {
            return "Product is defective";
        } else if (reason === "wrong-item") {
            return "Received the wrong item";
        } else if (reason === "unwanted") {
            return "No longer wanted";
        } else if (reason === "other") {
            return "Other";
        }
        return "";
    };

    $scope.conditionLabel = function () {
        var condition = $scope.returnDetails.productCondition;
        if (condition === "new") {
            return "New / Unused";
        } else if (condition === "opened") {
            return "Opened but unused";
        } else if (condition === "used") {
            return "Used";
        } else if (condition === "damaged") {
            return "Damaged";
        }
        return "";
    };

    $scope.validateReturn = function () {
        $scope.errors = {};
        if ($scope.productName() === "") {
            $scope.errors.productId = true;
        }
        if ($scope.reasonLabel() === "") {
            $scope.errors.returnReason = true;
        }
        if ($scope.conditionLabel() === "") {
            $scope.errors.productCondition = true;
        }
        if (!$scope.returnDetails.orderNumber || $scope.returnDetails.orderNumber.trim() === "") {
            $scope.errors.orderNumber = true;
        }
        for (var error in $scope.errors) {
            return false;
        }
        return true;
    };

    $scope.returnChanged = function () {
        $scope.success = false;
        $scope.message = "";
        if ($scope.submitted) {
            $scope.validateReturn();
        }
    };

    // This is the form's only submission handler. AngularJS prevents navigation.
    $scope.submitReturn = function () {
        $scope.submitted = true;
        $scope.success = $scope.validateReturn();
        if ($scope.success) {
            $scope.message = "Your demo return details passed validation. No return has been processed and no request has been sent or saved.";
        } else {
            $scope.message = "Please correct the highlighted return fields.";
        }
    };
});
