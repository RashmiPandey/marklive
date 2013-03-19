function SignupController($scope, $http) {
    $scope.submit = function() {
        $http.post('/auth/signup', { name: $scope.name, email: $scope.email, password: $scope.password }).success(function(a) {
            alert(a);
        }).error(function(errors) {
            if (errors) {
                $scope.hasErrors = true;
                $scope.errorMsg = errors[0].msg;
            }
        });
    }
}