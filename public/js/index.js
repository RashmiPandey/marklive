var app = angular.module('app', ['ui.bootstrap']);

function IndexController($scope, $dialog, $http) {
    $scope.login = function() {
        var d = $dialog.dialog();
        d.open('/public/dialogs/dropbox.html', 'DropboxController');
    }
}

function DropboxController($scope, dialog) {
    $scope.accept = function() {
        window.location.href = '/auth';
    }

    $scope.close = function() {
        dialog.close();
    }
}
