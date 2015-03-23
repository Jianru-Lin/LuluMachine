var express = require('express');
var router = express.Router();
var path = require('path')

router.get(/./, function(req, res) {
	
	// warning: development environment only, security problem
	
	// var file = path.resolve(__dirname, '../views/', '.' + req.url + '.jade')
	// res.end(JSON.stringify({
	// 	__dirname: __dirname,
	// 	url: req.url,
	// 	file: file
	// }, null, 4))

	res.render(req.url.substring(1))
});

module.exports = router;
