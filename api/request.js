/**
 * Created by zhouzhongwei on 2017/6/29.
 */
let https = require('https');
function request () {
	this.httpsGet =  function (options_call, callback) {
        let req = https.request(options_call, function (res) {
            let result = '';
			res.setEncoding('utf8');
			res.on('data', function (chunk) {
				result += chunk;
			});

			res.on('end', function () {
				try {
					result = JSON.parse(result);
				} catch (e) {
					console.log(e);
				}
				callback(null, result)
			});
		}).on('error', function () {
			console.log('httpsGet error');
			callback(null);
		});

		req.end();
	};
}
module.exports = new request();