var CronJob = require('cron').CronJob;
var db = require('./db');

module.exports.cacheCandles = new CronJob('0 0 7 * * *', function() { // every day at 7 o'clock
  db.cacheCandles();
}, null, true);
