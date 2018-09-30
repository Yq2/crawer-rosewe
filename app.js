let async = require('async');
let Dbapi = require('./api/dbapi');
let rosewe=require('./task/rosewe');
let dateNull = 1;

process.on('uncaughtException', function (err) {
    console.log('!!!uncaughtException', new Date().toString(), err.stack);
});

console.log('mainFunction start run >>>>');

mainFunction();
function mainFunction() {
    rosewe.run(function (err) {
        console.log('mainFunction complete <<<<<<');
    });
}
