var util = require('util');

module.exports = function(app) {
	app.get('/auth', function(req, res) {
		if (req.query.oauth_token) {
			dropbox.accesstoken(req.session.request_token, function(status, access_token) {
				res.cookie('access_token', access_token, { maxAge: 99999999 });
				res.redirect('/editor');
			});
		} else if (req.cookies.access_token) {
			res.redirect('/editor');
		} else {
			dropbox.requesttoken(function(status, request_token) {
				req.session.request_token = request_token;
				res.redirect(request_token.authorize_url + '&oauth_callback=http://localhost:8080/auth');
			});
		}
	});

    app.get('/auth/logout', function(req, res) {
        req.session.user = null;
        res.clearCookie('access_token');
        res.redirect('/');
    });
}
