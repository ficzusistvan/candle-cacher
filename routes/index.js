var express = require('express');
var router = express.Router();
var db = require('../db');

/* GET home page. */
router.get('/candles/:symbol/:period', async function(req, res, next) {
  const candles = await db.getCandles(req.params.symbol, req.params.period);
  res.send(candles[0]);
});

module.exports = router;
