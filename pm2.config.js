var rootPath = __dirname;
var packageInfo = require(rootPath + '/package.json');

module.exports = {
	"apps": [{
		"name": packageInfo.name,
		"script": "www/production.js",
		"cwd": rootPath,
		"exec_mode": "cluster",
		"instances": 2,
		"log_file": "/var/log/pm2/" + packageInfo.name + ".log",
		"log_date_format": "YYYY-MM-DD HH:mm Z",
		"merge_logs": true,
		"max_memory_restart": "1G",
		"autorestart": true,
		"node_args": [],
		"args": [],
		"env": {

		}
	}]
}
