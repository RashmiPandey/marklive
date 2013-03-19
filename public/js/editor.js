var app = angular.module('editor', ['ui.bootstrap']);

var CollaborativeEditor = {
    sendCursorRequest: function(socket, pos) {
        socket.emit('cursor', $.extend({ doc: this._id }, pos));
    },

    sendJoinRequest: function(socket) {
        socket.emit('join', this);
    },
    
    sendLeaveRequest: function(socket) {
        socket.emit('leave', this);
    },
    
    sendCustomRequest: function(socket, name, args) {
        socket.emit(name, args);
    }
};

var Document = function(properties) {
    return $.extend(properties, CollaborativeEditor);
}

app.service('Documents', function($http) {
    // get all documents (without content)
    this.all = function(cb) {
        $http.get('/documents').success(function(data) {
            var documents = [];

            for (var i in data)
                documents.push(new Document(data[i]));

            cb(documents);
        });
    }

    // fetch document content
    this.fetch = function(document, cb) {
        $http.get('/documents/' + document._id).success(function(data) {
            document.content = data.content;
            cb(document);
        });
    }

    // save the document content
    this.save = function(document, cb) {
        $http.post('/documents/' + document._id, { name: document.name, content: document.content }).success(cb ? cb : function() { });
    }

    // creates a document
    this.create = function(name, cb) {
        $http.post('/documents', { name: name }).success(cb);
    }
});

var colors = [
    "1500FF", "FF0000", "055E00", "808080", "FF7700", "00C8FF", "B700FF", "F2FF00", "00FF11", "FF999B"
];

var User = function(editor, index) {
    return {
        showCursor: function(range) {
            this.marker = editor.getSession().addMarker(range, "ace_bracket", function(html, range, left, top, config) {
                var bg = "background-color:#" + colors[index];
                html.push('<div class="cool" style="' + bg + ';left:' + left + 'px;top:' + top + 'px"></div>');
                html.push('<div class="cool cool_header" style="' + bg + ';left:' + left + 'px;top:' + top + 'px;"></div>');
            });
        },

        hideCursor: function() {
            var marker = editor.getSession().getMarkers()[this.marker];
            editor.getSession().removeMarker(marker.id);
        },

        updateCursor: function(cursor) {
            var marker = editor.getSession().getMarkers()[this.marker];
            marker.range = new Range(cursor.row, cursor.column, cursor.row, cursor.column+1);
        }
    }
}

var Range = ace.require('ace/range').Range;

function EditorController($scope, $http, $dialog, Documents) {
    var editor = ace.edit("editor");
    var users = {};
    var sessions = {};
    var socket = io.connect();

    var ignoreChangeEvent = false;
    var saveTimer = 0;

    $scope.openDocuments = [];
    $scope.documents = [];
    $scope.activeDocument = null;

    function updateEditorContents(cb) {
        ignoreChangeEvent = true;
        cb();
        ignoreChangeEvent = false;
    }

    function updatePreview() {
        var converter = new Showdown.converter({ extensions: ['table'] });
        $('#preview .content').html(converter.makeHtml(editor.getSession().getValue()));
        $('#preview .content table').addClass('table table-bordered table-nonfluid');
    }

    Documents.all(function(documents) {
        $scope.documents.push.apply($scope.documents, documents);
    });

    editor.setTheme("ace/theme/textmate");

    socket.on('join', function(data) {
        var document = new Document(data.doc);

        $('.bottom-right').notify({
            fadeOut: { enabled: true, delay: 8000 },
            type: 'info',
            message: { html: '<b>' + data.user.name + '</b> está editando o arquivo <i>' + data.doc.name + '</i>' }
        }).show();

        document.sendCursorRequest(socket, editor.getCursorPosition());

        users[data.user.email] = new User(editor, Object.keys(users).length);
    });

    socket.on('leave', function(data) {
        $('.bottom-right').notify({
            fadeOut: { enabled: true, delay: 8000 },
            type: 'warning',
            message: { html: '<b>' + data.user.name + '</b> desconectou-se deste arquivo' }
        }).show();

        users[data.user.email].hideCursor();
        editor.updateSelectionMarkers();

        delete users[data.user.email];
    });

    socket.on('cursor', function(data) {
        var user = users[data.user.email];
        if (!user) {
            users[data.user.email] = new User(editor, Object.keys(users).length);
            user = users[data.user.email];
        }

        if (user.marker) {
            user.updateCursor(data);
            editor.updateSelectionMarkers();
        } else {
            var range = new Range(data.row, data.column, data.row, data.column+1);
            user.showCursor(range);
        }
    });

    socket.on('insertText', function(data) {
        updateEditorContents(function() {
            var pos = { column: data.range.start.column, row: data.range.start.row };
            editor.getSession().getDocument().insert(pos, data.text);
        });
    });

    socket.on('insertLines', function(data) {
        updateEditorContents(function() {
            editor.getSession().getDocument().insertLines(data.range.start.row, data.lines);
        });
    });

    socket.on('removeText', function(data) {
        updateEditorContents(function() {
            var start = data.range.start, end = data.range.end;
            editor.getSession().getDocument().remove(new Range(start.row, start.column, end.row, end.column));
        });
    });

    socket.on('removeLines', function(data) {
        updateEditorContents(function() {
            editor.getSession().getDocument().removeLines(data.range.start.row, data.range.end.row-1);
        });
    });

    $scope.isSharedDocument = function(document) {
        if (!document.users) return false;
        return document.users.indexOf(userSession.email) != -1;
    }

    $scope.isNotSharedDocument = function(document) {
        return userSession.email == document.owner;
    }

    $scope.newDocument = function() {
        var d = $dialog.dialog();
        d.open('/public/dialogs/new_document.html', 'NewDocumentController').then(function(result) {
            Documents.create(result, function(document) {
                $scope.openDocuments.push(document);
                $scope.documents.push(document);
                $scope.setActiveDocument(document);
            });
        });
    }

    $scope.openDocument = function(document) {
        editor.focus();

        for (var i in $scope.openDocuments) {
            if ($scope.openDocuments[i]._id == document._id)
                return;
        }

        setTimeout(function() {
            Documents.fetch(document, function(document) {
                $scope.openDocuments.push(document);
                $scope.setActiveDocument(document);
            });
        }, 2000);
    }

    $scope.saveDocument = function() {
        $scope.activeDocument.content = editor.getSession().getDocument().getValue();
        Documents.save($scope.activeDocument, function() {
            $('.bottom-right').notify({
                fadeOut: { enabled: true, delay: 3000 },
                type: 'success',
                message: { text: 'Documento salvo com sucesso' }
            }).show();
        });
    }

    $scope.dropboxSave = function() {
        var d = $dialog.dialog({ resolve: { document: function() { return $scope.activeDocument; } } });
        d.open('/public/dialogs/dropbox_save.html', 'DropboxSaveController').then(function(result) {
        });
    }

    $scope.shareDocument = function() {
        var d = $dialog.dialog({ resolve: { document: function() { return $scope.activeDocument; } } });
        d.open('/public/dialogs/share_document.html', 'ShareDocumentController').then(function(result) {
            $http.post('/documents/' + $scope.activeDocument._id + '/share', { email: result }).success(function() {
            });
        });
    }

    $scope.setActiveDocument = function(document) {
        if ($scope.activeDocument)
            socket.emit('leave', $scope.activeDocument);

        if (!sessions[document._id]) {
            var session = new ace.EditSession(document.content || "", 'ace/mode/markdown');
            session.selection.on('changeCursor', function() {
                document.sendCursorRequest(socket, editor.getCursorPosition());
            });

            session.on('change', function(e) {
                updatePreview();

                if (ignoreChangeEvent) return;
                socket.emit(e.data.action, e.data);

                if (saveTimer != 0) {
                    clearTimeout(saveTimer);
                }

                saveTimer = setTimeout(function() {
                    $scope.activeDocument.content = editor.getSession().getDocument().getValue();
                    Documents.save($scope.activeDocument);
                    saveTimer = 0;
                }, 2000);
            });

            editor.setSession(session);

            updatePreview();

            sessions[document._id] = session;
        } else {
            editor.setSession(sessions[document._id]);
        }

        document.sendJoinRequest(socket);
        document.sendCursorRequest(socket, editor.getCursorPosition());

        $scope.activeDocument = document;
    }
}

var NewDocumentController = function($scope, dialog) {
    $scope.close = function() {
        dialog.close();
    }

    $scope.accept = function() {
        dialog.close($scope.name);
    }
}

var ShareDocumentController = function($scope, dialog, document, $http) {
    $scope.hasShares = false;
    $scope.shares = [];

    $http.get('/documents/' + document._id + '/shares').success(function(data) {
        for (var i in data) $scope.shares.push(data[i]);

        $scope.hasShares = $scope.shares.length > 0;
    });

    $scope.add = function() {
        if ($scope.email.length == 0) {
            alert("E-email não informado");
            return;
        }

        $scope.shares.push($scope.email);
        $scope.hasShares = true;
        $http.post('/documents/' + document._id + '/share', { email: $scope.email });
    }

    $scope.close = function() {
        dialog.close();
    }
}

var DropboxSaveController = function($scope, dialog, document, $http) {
    $scope.folders = [];
    $scope.currentPath = "/";

    $scope.open = function(path) {
        $scope.folders.length = 0;

        $http.get('/dropbox' + path).success(function(files) {
            var parentPath = path.replace(/\\/g,'/').replace(/\/[^\/]*$/, '');
            if ($scope.currentPath != '/') {
                $scope.folders.push({ path: (parentPath ? parentPath : '/'), name: ".." });
            }

            for (var i in files) {
                var name = files[i].replace(/^.*[\\\/]/, '');
                $scope.folders.push({ path: files[i], name: name });
            }
        });

        $scope.currentPath = path;
    }

    $scope.save = function() {
        $http.post('/dropbox' + $scope.currentPath + '/' + document.name, { content: document.content }).success(function() {
            dialog.close();
        });
    }

    $scope.close = function() {
        dialog.close();
    }

    $scope.open('/');
}
