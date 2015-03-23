define(function() {
	return function(url) {
		// this works both in IE and Chrome etc.
		var a = document.createElement('a')
		a.setAttribute('href', url)
		document.location.href = a.href
	}
})