$(function() {
	var editor
	var input

	ace.require("ace/ext/language_tools")

	editor = ace.edit("editor")
	editor.setTheme("ace/theme/ambiance")
	editor.getSession().setMode("ace/mode/javascript")
	editor.setValue('')
	// editor.setOptions({
	// 	enableBasicAutocompletion: true,
	// 	enableSnippets: true,
	// 	enableLiveAutocompletion: true
	// })

	input = ace.edit("input")
	input.setTheme("ace/theme/dawn")
	input.getSession().setMode("ace/mode/text")
	input.setValue('')

})

$(function() {
	var presentation = window.presentation = new Vue({
		el: '.presentation',
		data: {
			len: 0,
			pos: 0,
			segmentList: [{
				charList: ['H', 'E', 'L', 'L', 'O'],
				indexList: [0, 1, 2, 3, 4]
			}]
		}
	})
})