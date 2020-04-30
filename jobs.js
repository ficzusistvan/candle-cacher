var CronJob = require('cron').CronJob;
var db = require('./db');

module.exports.cacheCandles = new CronJob('0 0 7 * * *', function() { // every day at 7 o'clock
  db.cacheCandles();
}, null, true);

module.exports.backupReminder = new CronJob('0 0 8 * * 5', function() { // every Friday at 8 o'clock
  db.backupReminder();
}, null, true);