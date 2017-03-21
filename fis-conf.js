'use strict';
var baseignore = ['/node_modules/**', '/output/**', '/fis-conf.js', 'runtime/**', '/pkg/**'];
var ignore = baseignore.concat([]);
var upignore = baseignore.concat('/src/common/config/**');


// 浏览器端资源只需要编译 html 文件，以及其用到的资源。
fis.set('project.files', [
	'/src/**',
	'/view/**',
	'/www/*.js',
	'/www/static/js/**', // chunk 为 webpack 生成，fis 依赖无法处理，整体拷贝
	'/www/theme/**',
	'/map.json',
	'/pm2.json'
]);
fis.set('project.ignore', ignore);

fis.media('update').set('project.ignore', upignore);

fis.match('*', {
	deploy: [
		fis.plugin('local-deliver', {
			to: 'output'
		})
	]
});


// 静态通用压缩
fis.match('/www/static/**.js', {
	optimizer: fis.plugin('uglify-js')
}).match('/www/static/**.css', {
	optimizer: fis.plugin('clean-css')
}).match('/www/static/**.png', {
	optimizer: fis.plugin('png-compressor')
})/*.match('*.html:js', {
	optimizer: fis.plugin('uglify-js')
}).match('*.html:css', {
	optimizer: fis.plugin('clean-css')
})*/;



// 项目处理
fis.match('/{src,view}/**', {
	useMap: false
}).match('/src/(**.js)', {
	parser: fis.plugin('babelcore', {
		options: {
			presets: [
				["es2015", {
					"loose": true
				}], 'stage-1'
			],
			plugins: ['transform-runtime']
		}
	}),
	release: '/app/$1'
}).match('/www/(static/**)', {
	url: '/$1',
	useHash: true
}).match('/www/(theme/**)', {
	url: '/$1'
}).match('/www/static/js/chunk.*', {
	useHash: false
});

fis.match('::package', {
	postpackager: fis.plugin('loader')
});

fis.on('lookup:file', function (info, file) {
	var rest = info.rest || '';

	if (rest.indexOf('/static') === 0) {
		var realInfo = fis.uri(info.quote + '/www' + rest + info.quote);
		fis.util.merge(info, realInfo);

		return info;
	}
});