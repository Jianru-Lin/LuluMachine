$(function() {
	var srcEditor
	var txtEditor

	ace.require("ace/ext/language_tools")

	srcEditor = ace.edit("srcEditor")
	srcEditor.setTheme("ace/theme/ambiance")
	srcEditor.getSession().setMode("ace/mode/javascript")
	srcEditor.setValue('')
	// srcEditor.setOptions({
	// 	enableBasicAutocompletion: true,
	// 	enableSnippets: true,
	// 	enableLiveAutocompletion: true
	// })

	txtEditor = ace.edit("txtEditor")
	txtEditor.setTheme("ace/theme/dawn")
	txtEditor.getSession().setMode("ace/mode/text")
	txtEditor.setValue('')

	window.srcEditor = srcEditor
	window.txtEditor = txtEditor
})

$(function() {
	var presentation = window.presentation = new Vue({
		el: '.presentation',
		data: {
			len: 0,
			pos: 0,
			segmentList: [/*{
				charList: ['H', 'E', 'L', 'L', 'O'],
				indexList: [0, 1, 2, 3, 4],
				tokenizerList: [{
					name: 'comment/string',
					statusList: ['accept', 'accept', 'reject']
				}]
			}*/]
		}
	})
})

$(function() {
	var controlbar = window.controlbar = new Vue({
		el: '.controlbar',
		methods: {
			onPlay: function(e) {
				var src = srcEditor.getValue()
				var txt = txtEditor.getValue()
				alert(src)
				alert(txt)
			}
		}
	})
})