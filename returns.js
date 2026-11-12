
// Aidan: AngularJS return validation and MongoDB submission.
var returnsApp = angular.module("returnsApp", []);

returnsApp.controller("ReturnsController", function ($scope, $http) {
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

        if (
            !$scope.returnDetails.orderNumber ||
            $scope.returnDetails.orderNumber.trim() === ""
        ) {
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

    // Validates and saves the return request to MongoDB.
    $scope.submitReturn = function () {
        $scope.submitted = true;
        $scope.success = false;

        if (!$scope.validateReturn()) {
            $scope.message = "Please correct the highlighted return fields.";
            return;
        }

        var returnData = {
            productId: $scope.returnDetails.productId,
            orderNumber: $scope.returnDetails.orderNumber.trim(),
            returnReason: $scope.returnDetails.returnReason,
            productCondition: $scope.returnDetails.productCondition
        };

        $http.post("/api/returns", returnData)
            .then(function (response) {
                $scope.success = true;
                $scope.message = response.data.message ||
                    "Your return request was successfully saved.";
            })
            .catch(function (error) {
                $scope.success = false;
                $scope.message =
                    error.data && error.data.message
                        ? error.data.message
                        : "There was a problem saving your return request. Please try again.";

                console.error("Return submission failed:", error);
            });
    };
});
