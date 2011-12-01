#!/usr/local/bin/perl -w
#
# CDDL HEADER START
#
# The contents of this file are subject to the terms of the
# Common Development and Distribution License (the "License").
# You may not use this file except in compliance with the License.
#
# You can obtain a copy of the license at usr/src/OPENSOLARIS.LICENSE
# or http://www.opensolaris.org/os/licensing.
# See the License for the specific language governing permissions
# and limitations under the License.
#
# When distributing Covered Code, include this CDDL HEADER in each
# file and include the License file at usr/src/OPENSOLARIS.LICENSE.
# If applicable, add the following below this CDDL HEADER, with the
# fields enclosed by brackets "[]" replaced with your own identifying
# information: Portions Copyright [yyyy] [name of copyright owner]
#
# CDDL HEADER END
#

#
#ident	"@(#)index.cgi	1.4	07/01/30 SMI"
#
# Copyright 2007 Sun Microsystems, Inc.  All rights reserved.
# Use is subject to license terms.
#
# index.cgi -- given a message ID, lookup the corresponding article
#
# this script is run for any URL of the form:
#	http://sun.com/msg/...
#
use CGI qw/:cgi :form :html escapeHTML/;
use strict;

# version string for this script, appears in comment in generated pages
my $mysccs = '@(#)index.cgi	1.4	07/01/30 SMI';

# email address for feedback
my $mailto = 'msg-feedback@sun.com';

# sendmail command used to send feedback
my $mailprog = '/usr/lib/sendmail -t -eq';

# default title (changed to message ID if lookup succeeds)
my $title = 'Sun Microsystems Message Lookup';

# directory containing articles
my $articles = ".articles";

# directory containing HTML templates
my $templates = "$articles/templates";

# URL prefix used to expand links in articles which contain %DOCURL%
my $docbaseurl = "/msgdoc";

# URL of this script (the public version which is rewritten by server)
my $baseurl = "";
$baseurl = "http://" . $ENV{SERVER_NAME} if defined($ENV{SERVER_NAME});
if (defined($ENV{SERVER_PORT}) && $ENV{SERVER_PORT} ne "80") {
	$baseurl .= ":" . $ENV{SERVER_PORT};
}
$baseurl = $ENV{SERVER_URL} if defined($ENV{SERVER_URL});
$baseurl .= "/msg";

# the message ID being looked up (i.e. it was appended to $baseurl)
my $urlpath = "";
$urlpath = $ARGV[0] if defined($ARGV[0]);

# table of keywords expanded when displaying articles
my %kw;
$kw{DOCDIR} = $articles;

my $q = new CGI;

$kw{MSGURL} = $baseurl;

# message ID given to us, which needs checking
my $checkpath;
if (defined($q->param('msgid'))) {
	# message ID was posted to us via form.
	# ignore any urlpath given on the URL.
	$urlpath = "";
	$checkpath = $q->param('msgid');
} else {
	$checkpath = $urlpath;
}

# feedback values, if feedback form was posted
my $regarding;
my $name;
my $email;
my $rating;
my $comments;
if (defined($q->param('regarding'))) {
	$regarding = $q->param('regarding');
	$name = $email = $rating = $comments = "";
	$name = $q->param('name') if defined($q->param('name'));
	$email = $q->param('email') if defined($q->param('email'));
	$rating = $q->param('rating') if defined($q->param('rating'));
	$comments = $q->param('comments') if defined($q->param('comments'));

	# send the comments in
	if (open(M, "|$mailprog")) {
		$kw{MAILRESULTS} = "message sent successfully";
		print M <<EOF;
To: $mailto
Subject: Feedback from $baseurl

[Reminder: don't reply directly to this message, it won't work.]

Regarding: $regarding
     Name: $name
    Email: $email
   Rating: $rating
 Comments:

$comments

EOF
		close(M);
	} else {
		$kw{MAILRESULTS} = "ERROR: $mailprog: $!";
	}
}

if ($checkpath eq "") {
	# no message ID given, just display main page
	start($title);
	spewfile($templates, "empty");
	finish();
	#NOTREACHED
}

$kw{MSGID_AND_OPTIONS} = $kw{MSGID} = escapeHTML($checkpath);

# look for these messages ID patterns:
#	(30 bits)     DICT-XXXX-XX
#	(50 bits)     DICT-XXXX-XXXX-XX
#	(70 bits)     DICT-XXXX-XXXX-XXXX-XX
#	(90 bits)     DICT-XXXX-XXXX-XXXX-XXXX-XX
#
# we also allow a two-letter locale with a slash to
# come at the beginning of the code, like this:
#
#	de/DICT-XXXX-XX
#
# we accept more than the expected alphabet to
# give the code fixing below a chance to help
#
unless ($checkpath =~
    /.*?(([a-zA-Z]{2})\/)?(\w+)-(([a-zA-Z0-9]{4}-){1,4}[a-zA-Z0-9]{2}).*/) {
	# couldn't find anything resembling a message ID
	start($title);
	spewfile($templates, "badformat");
	finish();
	#NOTREACHED
}

# remember components of message ID
my $lang = $2;
my $dict = $3;
my $xpart = $4;

# normalize the path
$lang = lc($lang);
$lang = "" if $lang =~ /^en$/;
my $langsep;
if ($lang eq "") {
	$langsep = "";
} else {
	$langsep = "/";
}
$dict = uc($dict);
$xpart = uc($xpart);
$xpart =~ s/B/8/g;
$xpart =~ s/I/1/g;
$xpart =~ s/O/0/g;
$xpart =~ s/Z/2/g;

# check for article existence
if (!-f "$articles/$dict/$lang$langsep$xpart") {
	# article doesn't exist, but try forcing it to english
	if ($lang ne "" && -f "$articles/$dict/$xpart") {
		$lang = "";
		$langsep = "";
	} else {
		# article doesn't exist
		start($title);
		spewfile($templates, "badchecksum");
		finish();
		#NOTREACHED
	}
}

# we now know an article exists, correct the URL given if necessary
if ($urlpath ne "$lang$langsep$dict-$xpart") {
	# redirect user's browser to corrected URL
	print $q->redirect("$baseurl/$lang$langsep$dict-$xpart");
	exit 0;
}

$kw{MSGID_AND_OPTIONS} = "$lang$langsep$dict-$xpart";
$kw{MSGID} = "$dict-$xpart";
$kw{DOCURL} = "$docbaseurl/$dict";

# show the article
start("Sun Message ID: $dict-$xpart", $lang);
spewfile($templates, "feedbacksent", $lang) if $regarding;
spewfile($templates, "success", $lang);
spewfile("$articles/$dict", $xpart, $lang);
spewfile($templates, "feedbackform", $lang) unless $regarding;
finish($lang);
#NOTREACHED

# spew a file to the user's browser, expanding keywords
sub spewfile {
	my $dir = shift;
	my $file = shift;
	my $lang = shift;

	if ($lang) {
		$kw{PATH} = "$dir/$lang/$file";
		$kw{PATH} = "$dir/$file" unless -f $kw{PATH};
	} else {
		$kw{PATH} = "$dir/$file";
	}

	if (open(F, $kw{PATH})) {
		my $oldsep = $/;
		my $contents;

		undef $/;
		$contents = <F>;
		close F;
		$/ = $oldsep;

		# expand keywords
		$contents =~ s/\%DATE%/$kw{DATE}/g;
		$contents =~ s/\%DOCDIR%/$kw{DOCDIR}/g;
		$contents =~ s/\%DOCURL%/$kw{DOCURL}/g;
		$contents =~ s/\%MAILRESULTS%/$kw{MAILRESULTS}/g;
		$contents =~ s/\%MSGID%/$kw{MSGID}/g;
		$contents =~ s/\%MSGID_AND_OPTIONS%/$kw{MSGID_AND_OPTIONS}/g;
		$contents =~ s/\%MSGURL%/$kw{MSGURL}/g;
		$contents =~ s/\%PATH%/$kw{PATH}/g;
		print $contents;
	} else {
		# unexpected case, bail out
		# (put error info into HTML comment for debugging)
		print "\n<br>Article currently unavailable.<br>\n";
		print "\n<!-- ERROR: " . escapeHTML("$kw{PATH}: $!") . " -->\n";
		print end_html;
		exit 0;
	}
}

# print all the usual stuff starting the HTML output
sub start {
	my $title = shift;
	my $lang = shift;
	my $dt = `/bin/date`;

	chomp($dt);
	$kw{DATE} = $dt;

	# start the HTML document
	print header;
	print start_html(
		-title=>$title,
		-style=>{'src'=>'/msgdoc/default.css'},
		-meta=>{'ROBOTS'=>'NOINDEX,NOFOLLOW'},
		-bgcolor=>'#FFFFFF');
	print "\n\n<!-- " . escapeHTML($mysccs) . " -->\n\n";

	# standard sun.com header
	spewfile(".", "header", $lang);

	# our common message ID header
	spewfile($templates, "header", $lang);
}

# print all the usual stuff ending the HTML output and exit this script
sub finish {
	my $lang = shift;

	# our common message ID footer
	spewfile($templates, "footer", $lang);

	# standard sun.com footer
	spewfile(".", "footer", $lang);

	# end the HTML document
	print end_html;

	# this routine does not return
	exit 0;
}
