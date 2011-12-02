#!/usr/bin/env node

var fs = require('fs');
var sys = require('sys');
var sax = require('sax');
var path = require('path');
var async = require('async');

function log(str) {
	console.log(str);
}
function ins(obj) {
	return (sys.inspect(obj));
}

const BASEDIR = path.join(__dirname, "msg");

function ind(num) {
	var str = "";
	for (i = 0; i < num; i++)
		str += "    ";
	return (str);
}

module.exports.getMessage = function getMessage(dict, num, cb) {
	log("get message for " + dict + " entry " + num);

	var output = {};
	var current_name = null;
	var current_text = "";

	const files = [
		path.join(BASEDIR, "defaults.xml"),
		path.join(BASEDIR, dict, "defaults.xml"),
		path.join(BASEDIR, dict, "properties.xml"),
		path.join(BASEDIR, dict, "entry" + num + ".xml"),
		path.join(BASEDIR, dict, "en", "defaults.xml"),
		path.join(BASEDIR, dict, "en", "properties.xml"),
		path.join(BASEDIR, dict, "en", "entry" + num + ".xml")
	];


	function fail(err) {
		cb(err, null);
	}            

	function done(data) {
		cb(null, data);
        }

	var q = async.queue(function (fname, next) {
        	var file = fs.createReadStream(fname);
		var xml = sax.createStream(true);
		file.pipe(xml);

		file.on('open', function(fd) {
			log("  ... loading: " + fname);
		});
		file.on('error', function(ex) {
			log("  ... skipping, because: " + ex.message);
			next();
		});

		xml.on('error', fail);
		xml.on('text', function(tag) {
			current_text += tag;
		});
		xml.on('opentag', function(tag) {
			current_text = "";
		});
		xml.on('closetag', function(tag) {
			if (tag === "name") {
				current_name = current_text;
			} else if (tag === "item") {
				output[current_name] = current_text;
				current_name = null;
			}
		});
		xml.on('end', next);
        }, 1);

        q.drain = function() {
		done(output);
        };

	files.forEach(function (f) {
            q.push(f, function() {});
        });
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
