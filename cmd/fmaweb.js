#!/usr/bin/env node
/* vim: set ts=8 sts=8 sw=8 noet: */

var mod_path = require('path');
var mod_fs = require('fs');

var mod_restify = require('restify');
var mod_vasync = require('vasync');
var mod_bunyan = require('bunyan');

var lib_sunmsg = require('../lib/sunmsg');

/*
 * The order in which fields should appear.  Unspecified fields are arbitrary
 * and displayed last.
 */
var ORDER = [
	'title',
	'description',
	'severity',
	'type',
	'keys',
	'details',
	'impact',
	'response',
	'action',
];


function
template_loader(name)
{
	var path = mod_path.join(__dirname, '..', 'templates', name);

	return (function (req, res, next) {
		mod_fs.readFile(path, function (err, data) {
			if (err) {
				next(err);
				return;
			}

			if (!req.fma_templates) {
				req.fma_templates = {};
			}
			req.fma_templates[name] = req.fma_template =
			    data.toString('utf8');
			next();
		});
	});
}

function
handle_static(req, res, next)
{
	var buf = new Buffer(req.fma_template);
	res.contentType = 'text/html';
	res.contentLength = buf.length;
	res.writeHead(200);
	res.write(buf);
	res.end();
	next();
}

function
handle_submit(req, res, next)
{
	if (!req.body || !req.body.messageid) {
		res.header('location', '/msg');
		res.send(302);
		next();
		return;
	}

	res.header('location', '/msg/' + req.body.messageid);
	res.send(302);
	next();
}

function
handle_code(req, res, next)
{
	if (!req.params.code) {
		res.header('location', '/msg');
		res.send(302);
		next();
		return;
	}

	var MACROS = {
		msgid: req.params.code,
		fmaurl: process.env.FMA_URL || 'https://illumos.org/msg',
		distro: process.env.FMA_DISTRO || 'Illumos'
	};

	lib_sunmsg.getMessage(req.params.code, MACROS, function (err, vals) {
		if (err) {
			var buf = new Buffer(req.fma_templates['fail.html'].
			    replace(/%ERROR%/g, err));
			res.contentType = 'text/html';
			res.contentLength = buf.length;
			res.writeHead(400);
			res.write(buf);
			res.end();
			next();
			return;
		}

		delete vals['dict-entry'];
		delete vals['dictid'];

		/*
		 * Create the table rows for each key/value pair from the FMA
		 * message document.
		 */
		var t = '';
		var add = function (n, v) {
			t += '<tr>\n';
			t += '  <td><b>' + n + '</b></td>\n';
			t += '  <td>' + v + '</td>\n';
			t += '</tr>\n';
		};
		for (var i = 0; i < ORDER.length; i++) {
			if (!vals[ORDER[i]]) {
				continue;
			}

			add(ORDER[i], vals[ORDER[i]]);

			delete vals[ORDER[i]];
		}
		Object.keys(vals).sort().forEach(function (k) {
			add(k, vals[k]);
		});

		buf = new Buffer(req.fma_template.
		    replace(/%CODE%/g, req.params.code).
		    replace(/%TABLE%/g, t));
		res.contentType = 'text/html';
		res.contentLength = buf.length;
		res.writeHead(200);
		res.write(buf);
		res.end();
		next();
	});
}

function
create_server(ctx, callback)
{
	var log = ctx.ctx_log.child({ component: 'http' });

	var s = mod_restify.createServer({ log: log });

	s.use(mod_restify.plugins.bodyParser());
	s.use(mod_restify.plugins.requestLogger({
		headers: [ 'x-real-ip' ]
	}));

	s.get('/msg', template_loader('index.html'), handle_static);
	s.get('/msg/style.css', template_loader('style.css'), handle_static);
	s.post('/msg', handle_submit);
	s.get('/msg/:code', template_loader('fail.html'),
	    template_loader('msg.html'), handle_code);

	s.on('after', mod_restify.plugins.auditLogger({
		log: log.child({ audit: true }),
		event: 'after',
		server: s
	}));

	var PORT = 3027;
	s.listen(PORT, function () {
		log.info('listening on %d', PORT);

		ctx.ctx_server = s;

		setImmediate(callback);
	});
}

setImmediate(function
main()
{
	var log = mod_bunyan.createLogger({
		name: 'fmaweb',
		level: process.env.LOG_LEVEL || mod_bunyan.INFO,
		serializers: mod_bunyan.stdSerializers
	});

	var ctx = {
		ctx_log: log,
		ctx_server: null,
	};

	mod_vasync.pipeline({ arg: ctx, funcs: [
		create_server,

	]}, function (err) {
		if (err) {
			log.fatal(err, 'startup failure');
			process.exit(1);
		}

		log.info('startup ok');
	});
});
