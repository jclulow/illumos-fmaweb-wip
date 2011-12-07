
/**
 * Module dependencies.
 */

var express = require('express');
var sunmsg = require('./sunmsg');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

app.get('/msg/:code', function(req, res) {
	var obj;

	sunmsg.getMessage(req.params.code, function hand1(err, vals) {
		if (err) {
			return (res.render('fail.jade', { title: "error", error: err }));
		}

		delete vals['dict-entry'];
		delete vals['dictid'];

		var fields = [];
		for (var key in vals) {
			if (['XXX', 'dict-entry', 'dictid'].indexOf(key) >= 0)
				continue;
			if (key.match(/^po-/))
				continue;
			fields.push({'name': key, 'value': vals[key]});

		}

		// The order in which fields should appear, unspecified fields are arbitrary and last
		const order = ["title", "description", "severity", "type", "keys",
			       "details", "impact", "response", "action"].reverse();

		fields.sort(function (a, b) {
			return order.indexOf(b.name) - order.indexOf(a.name);
		});

		var hash = {
			title: req.params.code,
			fields: fields,
			msgid: req.params.code
		};
		return (res.render('msg.jade', hash));
	});
});

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
