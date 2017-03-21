process.env.NODE_ENV = 'production';

var st = new Date().getTime();

var fs = require('fs-promise');
var path = require('path');
var colors = require('colors/safe');
colors.enabled = true;
var cpp_exec = require('child_process').exec;

var exec = function (cmd) {
	return new Promise(function (resolve, reject) {
		var c = cpp_exec(cmd, function (error, stdout, stderr) {
			if (error !== null) {
				console.error('exec error: ' + error);
				reject(error);
			} else {
				resolve();
			}
		});
		c.stdout.pipe(process.stdout);
		c.stderr.pipe(process.stdout);
	});
};

var cp = function (src, tar) {
	return fs.exists(src).then(function (exists) {
		return exists ? fs.copy(src, tar) : Promise.resolve(false);
	});
};

function pack(src, dist) {
	var tar = require('tar-pack');
	return new Promise((resolve, reject) => {
		tar.pack(src, {fromBase: true})
			.pipe(require('fs').createWriteStream(dist))
			.on('error', function (err) {
				reject(err)
			})
			.on('close', function () {
				resolve()
			})
	})
}

var basePath = path.resolve(__dirname, '..') + '/';
var pkgconf = require(basePath + 'package.json');


var error = colors.red;
var argv = Array.prototype.concat.apply([], process.argv);
var outputPath = basePath + 'output/';
var pkgPath = basePath + 'pkg/';
var static = 'static';
var releaseType = argv[2] || 'update';

var modules = [];
for (var module in pkgconf.dependencies) {
	modules.push(module);
}

if (releaseType == 'all') {
	for (var module in pkgconf.devDependencies) {
		modules.push(module);
	}
}


Promise.resolve().then(function () {
	/*package.json*/
	// 避免同步删除
	return fs.exists(outputPath).then(function (exists) {
		return exists && fs.remove(outputPath);
	}).then(function () {
		return fs.mkdir(outputPath);
	}).then(function () {
		return Promise.all([
			fs.copy(basePath + 'package.json', outputPath + 'package.json'),
			cp(basePath + 'npm-shrinkwrap.json', outputPath + 'npm-shrinkwrap.json').then(function () {
				return cp(basePath + 'npm-shrinkwrap.production.json', outputPath + 'npm-shrinkwrap.json')
			})
		]);
	});
}).then(function () {
	/*node_modules*/
	if (releaseType != 'local' && releaseType != 'update') {
		console.log('begin release with node_modules');

		return Promise.resolve().then(function () {
			// 依赖
			if (releaseType == 'online' || releaseType == 'i') {
				console.log('\t npm install!');

				var cmd = 'cd ' + outputPath + ' && npm install --registry=https://registry.npm.taobao.org';
				if (true || releaseType == 'online') {
					cmd += ' --production';
				}

				return exec(cmd);
			} else if (releaseType == 'all' || releaseType == 'c') {
				console.log('\t copy!');

				var modulesPath = basePath + 'node_modules';
				return fs.exists(modulesPath).then(function (exists) {
					if (exists) {
						if (releaseType == 'all') {
							return fs.copy(modulesPath, outputPath + '/node_modules');
						} else {

							var modulesCpP = modules.map(function (module) {
								var mp = basePath + 'node_modules/' + module;
								return fs.exists(mp).then(function (exists) {
									return exists && fs.mkdirs(outputPath + mp).then(function () {
										fs.copy(mp, outputPath + mp);
									});
								});
							});
							return Promise.all(modulesCpP);
						}
					} else {
						console.log(colors.yellow('maybe you want copy node_modules, but node_modules is not exist.'));
					}
				});

			}
		})
	} else {
		fs.symlinkSync(basePath + 'node_modules', outputPath + 'node_modules', 'dir');
	}
}).then(function () {
	console.log('begin run webpack release');
	// 清理编译目录
	fs.removeSync(basePath + 'www/static/js/');
	// 使用系统调用，防止io延迟
	return exec('npm run webpack.build.production');
}).then(function () {

	/*调用fis进行编译*/
	console.log('begin run fis3 release');

	// io问题，调用子进程解决
	return exec('fis3 release ' + releaseType);
}).then(function () {
	var op = path.resolve(outputPath);

	if (!fs.existsSync(pkgPath)) {
		fs.mkdirSync(pkgPath);
	}

	/*npm打包*/
	if (releaseType == 'update') {
		console.log('begin tar');
		return fs.remove(outputPath + 'node_modules').then(function () {
			return pack(basePath + 'output/', pkgPath + pkgconf.name + '-' + pkgconf.version + '.update.tgz');
		});
	} else if (releaseType != 'local') {
		console.log('begin tar|pack with node_modules');

		return Promise.resolve().then(function () {
			var outpkgconf = Object.assign({}, pkgconf, {
				bundleDependencies: modules
			});
			delete outpkgconf.scripts.prepublish;
			fs.outputJSONSync(outputPath + 'package.json', outpkgconf);

			// 打包
			if (releaseType == 'online' || releaseType == 'c') {
				console.log('\t tar!');
				return pack(basePath + 'output/', pkgPath + pkgconf.name + '-' + pkgconf.version + '.copy.tgz');
			} else {
				console.log('\t pack!');

				return exec('cd ' + pkgPath + ' && npm pack ' + op);

			}
		});
	}
}).then(function () {
	console.log('\nrelease success!');
	console.log(colors.green('time: ' + (new Date().getTime() - st) + 'ms'));

	if (releaseType != 'local') {
		if (releaseType != 'update') {
			var shrinkwrap = fs.exists(basePath + 'npm-shrinkwrap.production.json').then(function (exists) {
				return !exists && exec('cd ' + outputPath + ' && npm prune && npm shrinkwrap').then(function () {
					cp(outputPath + 'npm-shrinkwrap.json', basePath + 'npm-shrinkwrap.production.json')
				});
			});
		} else {
			var shrinkwrap = Promise.resolve();
		}

		var del = shrinkwrap.then(function () {
			return fs.exists(outputPath).then(function (exists) {
				return exists && fs.remove(outputPath)
			});
		})
	}
}).catch(function (err) {
	console.error(error('[error] release fail. maybe need sudo!\n' + err.message));
});