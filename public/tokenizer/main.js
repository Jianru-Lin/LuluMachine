;$(function() {
	var editor

	ace.require("ace/ext/language_tools")
	editor = ace.edit("editor")
	editor.setTheme("ace/theme/dawn")
	editor.getSession().setMode("ace/mode/javascript")
	editor.setValue('')
	editor.setOptions({
		enableBasicAutocompletion: true,
		enableSnippets: true,
		enableLiveAutocompletion: true
	})
});