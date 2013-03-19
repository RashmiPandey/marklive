var express = require('express');
var app = module.exports = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

var sessionStore = new express.session.MemoryStore();

global.db = require('./lib/db.js').initialize({ database: 'livemd', host: 'localhost', port: 27017, user: null, password: null });
global.dropbox = require('dbox').app({ app_key: '0965f2jvw1s1ww8', app_secret: 'lzmpbuem1hsuv4g', root: 'dropbox'});

app.disable('x-powered-by');
app.use('/public', express.static(__dirname + '/public'));
app.use(express.bodyParser());
app.use(require('express-validator'));
app.use(express.cookieParser('your secret here'));
app.use(express.session({store: sessionStore, secret: 'supersecretkeygoeshere'}));

io.configure(function() {
    io.set('authorization', function(data, callback) {
        if (data.headers.cookie) {
            express.cookieParser('supersecretkeygoeshere')(data, {}, function(err) {
                sessionStore.get(data.signedCookies['connect.sid'], function(err, session) {
                    if (err || !session) {
                        callback('Error', false);
                    } else {
                        data.session = session;
                        callback(null, true);
                    }
                });
            });
        } else {
            callback('No cookie', false);
        }
    });
});

io.sockets.on('connection', function(socket) {
    socket.on('join', function(document) {
        var user = socket.handshake.session.user;
        if (!user) return;
        socket.room = document._id;
        socket.join(socket.room);
        socket.broadcast.to(socket.room).emit('join', { user: { _id: user._id, name: user.name }, doc: document });
    });

    socket.on('disconnect', function() {
        var user = socket.handshake.session.user;
        if (!user) return;
        socket.broadcast.to(socket.room).emit('leave', { user: { _id: user._id, name: user.name }, doc: { _id: socket.room } });
    });

    socket.on('leave', function(document) {
        var user = socket.handshake.session.user;
        if (!user) return;
        socket.room = null;
        socket.leave(document._id);
        socket.broadcast.to(document._id).emit('leave', { user: { _id: user._id, name: user.name }, doc: document });
    });

    socket.on('cursor', function(info) {
        var user = socket.handshake.session.user;
        if (!user) return;
        socket.broadcast.to(info.doc).emit('cursor', { user: { _id: user._id, name: user.name }, row: info.row, column: info.column });
    });

    socket.on('insertText', function(info) {
        var user = socket.handshake.session.user;
        if (!user) return;
        socket.broadcast.to(socket.room).emit('insertText', info);
    });

    socket.on('insertLines', function(info) {
        var user = socket.handshake.session.user;
        if (!user) return;
        socket.broadcast.to(socket.room).emit('insertLines', info);
    });

    socket.on('removeText', function(info) {
        var user = socket.handshake.session.user;
        if (!user) return;
        socket.broadcast.to(socket.room).emit('removeText', info);
    });

    socket.on('removeLines', function(info) {
        var user = socket.handshake.session.user;
        if (!user) return;
        socket.broadcast.to(socket.room).emit('removeLines', info);
    });
});

require('./routes/auth.js')(app);
require('./routes/documents.js')(app);
require('./routes/dropbox.js')(app);

app.get('/', function(req, res) {
    if (req.cookies.access_token)
        res.redirect('/editor');
    else
        res.sendfile(__dirname + '/public/index.html');
});

app.get('/editor', function(req, res) {
    if (!req.session.user && !req.cookies.access_token) res.redirect('/login.html');
	else {
		var client = dropbox.client(req.cookies.access_token);
		client.account(function(status, reply) {
			req.session.user = { email: reply.email };
			res.sendfile(__dirname + '/public/editor.html');
		});
	}
});

app.get(/\/(.*\.html)$/, function(req, res) {
    res.sendfile(__dirname + '/public/' + req.params[0]);
});

app.get('/session.js', function(req, res) {
    res.send('var userSession = ' + JSON.stringify(req.session.user) + ';');
});

server.listen(8080);

//app.listen((process.env.NODE_ENV == 'test' ? 8081 : null) || process.env.PORT || 8080);
