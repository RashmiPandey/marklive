var BSON = require('mongodb').BSONPure;

module.exports = function(app) {
    app.get('/documents', function(req, res) {
        if (!req.session.user) { res.send(500); return }
        db.collection('documents', function(err, collection) {
            collection.find({ $or: [ { users: { $in: [ req.session.user.email ] } },
                                     { owner: req.session.user.email } ] }, {}, function(err, cursor) {
                cursor.toArray(function(err, docs) {
                    res.send(docs);
                });
            });
        });
    });

    app.post('/documents', function(req, res) {
        if (!req.session.user) { res.send(500); return; }
        db.collection('documents', function(err, collection) {
            collection.insert({ name: req.body.name, owner: req.session.user.email }, function(err, docs) {
                res.send(docs[0]);
            });
        });
    });

    app.get(/\/documents\/([0-9a-f]{24})$/, function(req, res) {
        if (!req.session.user) { res.send(500); return }

        db.collection('documents', function(err, collection) {
            collection.find({ _id: BSON.ObjectID(req.params[0]) }, {}, function(err, cursor) {
                cursor.toArray(function(err, docs) {
                    res.send(docs[0]);
                });
            });
        });
    });

    app.post(/\/documents\/([0-9a-f]{24})$/, function(req, res) {
        if (!req.session.user) { res.send(500); return }

        db.collection('documents', function(err, collection) {
            collection.findAndModify({ _id: BSON.ObjectID(req.params[0]) }, [['_id','asc']],
                                     { $set: { content: req.body.content } }, { new: true },
                                     function(err, doc) { res.send(200); });
        });
    });

    app.get(/\/documents\/([0-9a-f]{24})\/shares$/, function(req, res) {
        if (!req.session.user) { res.send(500); return }

        db.collection('documents', function(err, collection) {
            collection.find({ _id: BSON.ObjectID(req.params[0]) }, {}, function(err, cursor) {
                cursor.toArray(function(err, docs) {
                    if (docs[0] && docs[0].users)
                        res.send(docs[0].users);
                    else
                        res.send([]);
                });
            });
        });
    });

    app.post(/\/documents\/([0-9a-f]{24})\/share$/, function(req, res) {
        if (!req.session.user) { res.send(500); return }

        db.collection('documents', function(err, collection) {
            collection.findAndModify({ _id: BSON.ObjectID(req.params[0]) }, [['_id','asc']],
                                     { $push: { users: req.body.email } }, { new: true },
                                     function(err, doc) { res.send(200); });
        });
    });
}