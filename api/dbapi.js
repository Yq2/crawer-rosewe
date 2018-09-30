let Functions = require('./functions.js');

function Dbapi() {
	this.sendMsg = function (data, callback, lastCount) {
        let dataUrl = Functions.combinUrl(data);
        let time = new Date().getTime();
        let _this = this;
		Functions.postRequest('http://10.40.6.82:10010/api.aspx', dataUrl, null, null, function (err, resData) {
			console.log('Dbapi time:', new Date().getTime() - time);
			try {
				resData = JSON.parse(resData);
			} catch (e) {
				/*if (resData.state === 'Error' && lastCount) {
				 lastCount--;
				 console.log('Dbapi Error try... lastCount', lastCount, resData);
				 //process.exit();e
				 return _this.sendMsg(data, callback, lastCount)
				 }*/
				return callback(null, resData);
			}
			return callback(err, resData);
		});
		//callback(null, null);
	};
	this.sendBanggoodPrice=sendBanggoodPrice;
}
module.exports = new Dbapi();

function sendBanggoodPrice(data, callback) {
	//正式地: https://www.gearbest.com/syn/syn_parity_crawl_goods.php
	let dataUrl = Functions.combinUrl(data);
	Functions.postRequest('http://10.33.21.49:5001/syn/syn_parity_crawl_goods.php', dataUrl, null, null, function (err, resData) {
		callback(err, resData);
	});
}