var mysql = require('mysql2/promise');
var moment = require('moment');
var WebSocket = require('ws');
var PushBullet = require('pushbullet');
var nconf = require('nconf');
nconf.file({
  file: 'config.json',
  search: true
});

const pool = mysql.createPool({
  host: nconf.get('mysql:host'),
  user: nconf.get('mysql:user'),
  password: nconf.get('mysql:password'),
  database: nconf.get('mysql:db')
});

var pusher = new PushBullet(nconf.get('pushbullet:api_key'));

const WS_ADDRESS = 'wss://ws.xtb.com/demo';
const SYMBOLS_AND_PERIODS = nconf.get('symbols_and_periods');
const USER_ID = nconf.get('xapi:user_id');
const PASSWORD = nconf.get('xapi:password');
const DEVICE_ID = nconf.get('pushbullet:device_id');
const SINCE = new Map(); // key: period in minutes, value: months of history data supported
SINCE.set(1, 1);
SINCE.set(5, 1);
SINCE.set(15, 1);
SINCE.set(30, 7);
SINCE.set(60, 7);
SINCE.set(240, 13);
SINCE.set(1440, 13);
SINCE.set(10080, 60);
SINCE.set(43200, 60);

let normalizeCandles = function (candles, scale) {
  return candles.map(candle => {
    let obj = { date: 0, open: 0, high: 0, low: 0, close: 0, volume: 0 };

    obj.date = candle['ctm'];
    obj.ctm = candle['ctm'];
    obj.ctmString = candle['ctmString'];
    obj.open = candle['open'] / scale;
    obj.high = obj.open + candle['high'] / scale;
    obj.low = obj.open + candle['low'] / scale;
    obj.close = obj.open + candle['close'] / scale;
    obj.volume = candle['vol'];

    return obj;
  });
}

downloadCandles = function (symbol, period, startTime, LOG_ID) {
  const ws = new WebSocket(WS_ADDRESS);
  return new Promise((resolve, reject) => {
    ws.addEventListener('open', () => {
      console.log(LOG_ID + 'Logging in... user_id: [' + USER_ID + '] password: [' + PASSWORD + ']');
      let msg = {
        command: "login",
        arguments: {
          userId: USER_ID,
          password: PASSWORD
        }
      };
      ws.send(JSON.stringify(msg));
    });
    ws.addEventListener('message', async (msg) => {
      const data = JSON.parse(msg.data);
      //console.log('ws message:', msg.data);
      if (data.status === true) {
        if (data.streamSessionId !== undefined) {
          console.log(LOG_ID + 'Logged in! Downloading candles... symbol: [' + symbol + '] period: [' + period + '] startTime: [' + startTime + ']');
          let msg = {
            command: "getChartLastRequest",
            arguments: {
              info: {
                period: period,
                start: startTime,
                symbol: symbol
              }
            }
          };
          ws.send(JSON.stringify(msg));
        } else {
          console.log(LOG_ID + 'Candles downloaded! Returning promise...');
          ws.close();
          resolve(normalizeCandles(data.returnData.rateInfos, Math.pow(10, data.returnData.digits)));
        }
      } else {
        console.log(LOG_ID + 'Rejecting:', data);
        pusher.note(DEVICE_ID, 'Candle cacher', JSON.stringify(data), (error, response) => {
          console.log(LOG_ID + 'Pusher error:', error);
          if (error !== null) {
            console.log(LOG_ID + 'Pusher response:', response);
          }
        });
        reject(data);
      }
    });
    ws.addEventListener('close', () => {
      console.log(LOG_ID + 'ws closed...');
    });
    ws.addEventListener('ping', () => {
    });
    ws.addEventListener('error', (error) => {
      console.log(LOG_ID + 'ws error: ', error);
    });
  });
}

exports.cacheCandles = async function () {
  console.log('Starting cache handling...');
  for (const SYMBOL_AND_PERIOD of SYMBOLS_AND_PERIODS) {
    const LOG_ID = '[' + SYMBOL_AND_PERIOD + '] ';
    console.log(LOG_ID + 'Handling symbol and period:', SYMBOL_AND_PERIOD);
    const SYMBOL = SYMBOL_AND_PERIOD.split('_')[0];
    const PERIOD = Number(SYMBOL_AND_PERIOD.split('_')[1]);
    const existingCandles = await pool.query('SELECT date FROM ' + SYMBOL + ' WHERE period = ' + PERIOD + ' ORDER BY date DESC LIMIT 1');
    console.log(LOG_ID + 'Last cached candle date:', existingCandles[0]);
    const startTime = existingCandles[0].length > 0 ? existingCandles[0][0].date : moment().subtract(SINCE.get(PERIOD), 'month').valueOf();
    const downloadedCandles = await downloadCandles(SYMBOL, PERIOD, startTime);
    console.log(LOG_ID + 'Downloaded candles length:', downloadedCandles.length);
    let values = '';
    for (let candle of downloadedCandles) {
      values += '(' + candle.date + ',' + candle.ctm + ',\"' + candle.ctmString + '\",' + candle.open + ',' + candle.high + ',' + candle.low + ',' + candle.close + ',' + candle.volume + ',' + PERIOD + '),';
    }
    values = values.slice(0, -1) + ' ON DUPLICATE KEY UPDATE date=date, ctm=ctm, ctmString=ctmString, open=open, high=high, low=low, close=close, volume=volume, period=period';
    await pool.query('INSERT INTO ' + SYMBOL + ' (date, ctm, ctmString, open, high, low, close, volume, period) VALUES ' + values);
    console.log(LOG_ID + 'Cached ' + downloadedCandles.length + ' new candles...');
    pusher.note(DEVICE_ID, 'Candle cacher', 'Cached ' + downloadedCandles.length + ' new candles...', (error, response) => {
      console.log(LOG_ID + 'Pusher error:', error);
      if (error !== null) {
        console.log(LOG_ID + 'Pusher response:', response);
      }
    });
  }
}

exports.getCandles = async function (symbol, period) {
  return pool.query('SELECT date, open, high, low, close, volume FROM ' + symbol + ' WHERE period = ' + period);
}