function IndexController($scope) {
    $scope.login = function() {
        var d = $dialog.dialog();
        d.open('/public/dialogs/dropbox.html', 'DropboxController').then(function(result) {
            Documents.create(result, function(document) {
                $scope.openDocuments.push(document);
                $scope.documents.push(document);
                $scope.setActiveDocument(document);
            });
        });
    }
}

function DropboxController($scope) {
}
