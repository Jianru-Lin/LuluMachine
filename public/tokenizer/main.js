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

	var player = window.player = {

		// tokenizer management

		tokenizerList: [],
		
		defTokenizer: function(name, def) {
			if (typeof name !== 'string' ||
				typeof def !== 'function') {
				return
			}
			var tokenizer = {
				name: name,
				def: def
			}
			this.tokenizerList.push(tokenizer)
			this.tokenizerList[name] = tokenizer
		},
		
		clearTokenizerList: function() {
			this.tokenizerList = []
		},

		// play loop

		_loopSpan: 1000,
		_loopHandle: undefined,
		_src: undefined,
		_txt: undefined,
		_nextPos: 0,

		get src() {
			return _src
		},

		set src(v) {
			this._src = v
			var fun = new Function('tokenizer', v)
			fun(this.defTokenizer.bind(this))
		},

		get txt() {
			return this._txt
		},

		set txt(v) {
			this._txt = v
		},

		get nextPos() {
			return this._nextPos
		},

		set nextPos(v) {
			this._nextPos = v
		},

		reset: function() {
			// clear tokenizer list
			this.clearTokenizerList()
		},

		play: function() {
			// start loop
			this._startLoop()
		},

		pause: function() {
			this._stopLoop()
		},

		_startLoop: function() {
			if (this._loopHandle) {
				return
			}
			this._loopHandle = setInterval(this._step.bind(this), this._loopSpan)
		},

		_stopLoop: function() {
			if (!this._loopHandle) {
				return
			}
			clearInterval(this._loopHandle)
			this._loopHandle = undefined
		},

		_step: function() {
			console.log('step ' + new Date())
			this.tokenizerList.forEach(function(tokenizer) {
				console.log('tokenizer', tokenizer.name)
			})
		}
	}

	var controlbar = window.controlbar = new Vue({
		el: '.controlbar',
		data: {
			noPlay: false,
			noPause: true,
		},
		methods: {
			onPlay: function(e) {
				var src = srcEditor.getValue()
				if (!src) {
					alert('引擎源代码为空！ Engine is empty.')
					return
				}

				var txt = txtEditor.getValue()
				if (!txt) {
					alert('测试输入为空！Text is empty.')
					return
				}

				player.src = src
				player.txt = txt
				// notice: dont' change the nextPos
				player.play()

				// update button state
				this.noPlay = true
				this.noPause = false
			},
			onPause: function(e) {
				player.pause()
				// update button state
				this.noPlay = false
				this.noPause = true
			}
		}
	})
})