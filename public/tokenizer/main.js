;$(function() {
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

});