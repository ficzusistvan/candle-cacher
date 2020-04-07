CREATE TABLE `de30` (
  `date` bigint(13) NOT NULL,
  `ctm` varchar(45) NOT NULL,
  `ctmString` varchar(45) NOT NULL,
  `open` decimal(10,5) NOT NULL,
  `high` decimal(10,5) NOT NULL,
  `low` decimal(10,5) NOT NULL,
  `close` decimal(10,5) NOT NULL,
  `volume` decimal(10,5) NOT NULL,
  `period` int(11) NOT NULL,
  PRIMARY KEY (`date`,`period`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
SELECT * FROM candle_cacher.de30;