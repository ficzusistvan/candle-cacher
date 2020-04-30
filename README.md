## Candle cacher

Everytime a new symbol and period is added, a new table has to be added to the MySQL db, with the name of the symbol.

### Running database backup script

1. Fix Unix file
``` bash
sed -i -e 's/\r$//' backup_db.sh
```
1. Make it executable
``` bash
chmod a+x backup_db.sh
```
1. Run the script with arguments
``` bash
./backup_db.sh user password db_name backup_path
```