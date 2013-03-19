var db = module.exports = {};
var mongo = require('mongodb');

db.initialize = function(options) {
    return new Db(options);
}

function Db(options) {
    var db = new mongo.Db(options.database, new mongo.Server(options.host, options.port), { safe: false });

    var connecting = false;
    var connected = false;

    var getConnection = function(cb) {
        if (connected) {
            cb(null);
        } else if (connecting) {
            db.once('connected', function(err) {
                cb(err);
            });
        } else {
            connecting = true;

            db.open(function(err) {
                db.connecting = false;
                db.emit('connected', err);

                if (err) {
                    connected = false;
                } else {
                    if (options.user && options.password) {
                        db.authenticate(options.user, options.password, function(err, success) {                            
                            connected = success;
                            cb(null);
                        });
                    } else {
                        connected = true;
                        cb(null);
                    }
                }
            });
        }
    };

    return {
        collectionNames: function(cb) {
            getConnection(function(err) {
                db.collectionNames(cb);
            });
        },

        dropDatabase: function(cb) {
            getConnection(function() {
                db.dropDatabase(cb);
            });
        },

        dropCollection: function(collection, cb) {
            getConnection(function(err) {
                db.dropCollection(collection, cb);
            });
        },

        collection: function(name, cb) {
            getConnection(function(err) {
                db.collection(name, cb);
            });
        }
    }
}
