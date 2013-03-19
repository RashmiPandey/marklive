function LoginController($scope, $http) {
    $scope.submit = function() {
        $http.post('/auth/login', { email: $scope.email, password: $scope.password }).success(function(a) {
            window.location.href = "/editor";
        }).error(function(errors) {
            if (errors) {
                $scope.hasErrors = true;
                $scope.errorMsg = errors[0].msg;
            }
        });
    }
}