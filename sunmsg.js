#!/usr/bin/env node

var fs = require('fs');
var sys = require('sys');
var sax = require('sax');

function log(str) {
	console.log(str);
}
function ins(obj) {
	return (sys.inspect(obj));
}

var BASEDIR = __dirname + "/msg";

function ind(num) {
	var str = "";
	for (i = 0; i < num; i++)
		str += "    ";
	return (str);
}

module.exports.getMessage = function getMessage(dict, num, cb) {
	var indent = 0;

	log("get message for " + dict + " entry " + num);

	var output = {};
	var current_name = null;
	var current_text = "";

	var files = [
		BASEDIR + "/defaults.xml",
		BASEDIR + "/" + dict + "/defaults.xml",
		BASEDIR + "/" + dict + "/properties.xml",
		BASEDIR + "/" + dict + "/entry" + num + ".xml",
		BASEDIR + "/" + dict + "/en/defaults.xml",
		BASEDIR + "/" + dict + "/en/properties.xml",
		BASEDIR + "/" + dict + "/en/entry" + num + ".xml"
	];

	var next, makeStream;
	next = function(err) {
		if (err)
			return(cb(err, null));

		if (files.length < 1)
			return (cb(null, output));

		/*log(files.length + " files left ...");*/

		var fname = files.shift();
		/*try {*/
			var stre = fs.createReadStream(fname);
			stre.on('open', function(fd) {
				log("  ... loading: " + fname);
			});
			stre.on('error', function(ex) {
				log("  ... skipping, because: " + ex.message);
				setTimeout(next, 0);
			});
			stre.pipe(makeStream());
		/*} catch (ex) {
			log("  ... skipping, because: " + ex.message);
			next();
		}*/
	}
	makeStream = function() {
		var _pars = sax.createStream(true);
		_pars.on('error', function(err) {
			log("ERROR: " + err.message);
			next(err);
		});
		_pars.on('text', function(tag) {
			/* log(ind(indent) + "text: " + ins(tag)); */

			current_text += tag;
		});
		_pars.on('opentag', function(tag) {
			indent++;
			/* log(ind(indent) + "opentag: " + ins(tag)); */

			current_text = "";
		});
		_pars.on('closetag', function(tag) {
			/* log(ind(indent) + "closetag: " + ins(tag)); */
			indent--;

			if (tag === "name") {
				current_name = current_text;
			} else if (tag === "item") {
				output[current_name] = current_text;
				current_name = null;
			}
		});
		_pars.on('end', function() {
			next();
		});
		return (_pars);
	}

	next();
	/*log("END getMessage");*/
}

/*
getMessage(process.argv[2], process.argv[3], function(err, obj) {
	if (err) {
		log("ERROR: " + err);
	} else {
		log("--------------------------------------");
		log("OUTPUT:");
		log("   " + ins(obj));
		log("--------------------------------------");
	}
});
*/
