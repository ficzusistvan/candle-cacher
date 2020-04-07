var express = require('express');
var router = express.Router();
var db = require('../db');

router.get('/candles/force-cache-update', async function(req, res, next) {
  await db.cacheCandles();
  res.send('Finished...');
});

router.get('/candles/:symbol/:period', async function(req, res, next) {
  const candles = await db.getCandles(req.params.symbol, req.params.period);
  res.send(candles[0]);
});

module.exports = router;
