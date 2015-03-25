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

	function Segment(src, txt, pos) {
		if (!src) {
			throw new Error('[Segment] src not provided')
		}
		if (!txt) {
			throw new Error('[Segment] txt not provided')			
		}
		if (pos < 0 || pos >= txt.length) {
			throw new Error('[Segment] pos ' + pos + ' is out of range [0, ' + txt.length + ')')
		}

		this.txt = txt
		this.pos = pos
		this.finished = false
		this.winnerTokenizer = undefined
		this.winnerTokenizerPos = undefined

		this.tokenizerList = init(src)
		
		// add an new segment to the UI

		presentation.len = this.txt.length
		presentation.pos = this.pos

		presentation.segmentList.push({
			charList: [],
			indexList: [],
			tokenizerList: this.tokenizerList.map(function(tokenizer) {
				return {
					name: tokenizer.name,
					statusList: []
				}
			})
		})

		// remember the segmentVM

		this.segmentVM = presentation.segmentList[presentation.segmentList.length - 1]

		function init(src) {
			var list = []
			var fun = new Function('tokenizer', src)
			fun(setupTokenizer)
			return list

			function setupTokenizer(name, fun) {
				if (typeof name !== 'string' ||
					typeof fun !== 'function') {
					throw new Error('invalid arguments')
				}
				var tokenizer = {
					name: name,
					fun: fun,
					finished: false
				}
				list.push(tokenizer)
				list[name] = tokenizer
			}
		}
	}

	Segment.prototype.next = function() {
		var self = this

		// update presentation

		presentation.len = this.txt.length
		presentation.pos = this.pos

		// get current character, if it's undefined, it means EOF

		var eof = this.pos === this.txt.length
		var c = this.txt[this.pos]

		// add new char

		if (!eof) {
			this.segmentVM.charList.push([c])
			this.segmentVM.indexList.push([this.pos])
		}
		else {
			this.segmentVM.charList.push([''])
			this.segmentVM.indexList.push(['eof'])			
		}


		// invoke every tokenizer

		this.tokenizerList = this.tokenizerList.map(function(tokenizer) {
			if (!tokenizer.finished) {
				var v = tokenizer.fun(c, this.pos, eof)
				if (typeof v === 'function') {
					tokenizer.fun = v
				}
				else {
					tokenizer.finished = true
					tokenizer.result = v
					// fill default value
					if (tokenizer.result[0] === 'accept' && tokenizer.result[1] === undefined) {
						tokenizer.result[1] = this.pos
					}
				}
				showTokenizerStatus(tokenizer)
			}
			return tokenizer
		}, this)

		// do not move forward when we meet eof

		if (!eof) {
			++this.pos
		}

		// check if finished

		var everyTokenizerFinished = this.tokenizerList.every(function(tokenizer) {
			return tokenizer.finished
		})

		this.finished = (eof || everyTokenizerFinished)

		this.error = (eof && !everyTokenizerFinished)

		// find winner tokenizer

		if (this.finished && !this.error) {
			this.winnerTokenizer = undefined
			this.tokenizerList.forEach(function(tokenizer) {
				if (tokenizer.result[0] !== 'accept') return
				if (this.winnerTokenizer === undefined) {
					this.winnerTokenizer = tokenizer
				}
				else if (tokenizer.result[1] > this.winnerTokenizer.result[1]) {
					this.winnerTokenizer = tokenizer
				}
			}, this)
			this.winnerTokenizerPos = this.winnerTokenizer.result[1]
		}
		else {
			this.winnerTokenizer = undefined
			this.winnerTokenizerPos = undefined
		}

		function showTokenizerStatus(tokenizer) {
			var segmentVM = self.segmentVM
			var tokenizerVM
			for (var i = 0, len = segmentVM.tokenizerList.length; i < len; ++i) {
				if (segmentVM.tokenizerList[i].name === tokenizer.name) {
					tokenizerVM = segmentVM.tokenizerList[i]
					break
				}
			}
			if (tokenizerVM) {
				// TODO: LL(k)
				var status = tokenizer.finished ? tokenizer.result[0] : 'continue'
				tokenizerVM.statusList.push(status)
			}
		}
	}

	// player use the 'presentation' object

	var player = window.player = {

		// play loop

		_loopSpan: 100,
		_loopHandle: undefined,
		_segment: undefined,
		src: undefined,
		txt: undefined,
		pos: 0,
		_finished: false,
		_error: false,

		get finished() {
			return this._finished
		},

		set finished(v) {
			this._finished = v
			if (v) {
				controlbar.noPlay = false
				controlbar.noPause = true
			}
			else {
				controlbar.noPlay = true
				controlbar.noPause = false
			}
		},

		get error() {
			return this._error
		},

		set error(v) {
			this._error = v
			if (v) {
				alert('出现错误')
			}
		},

		reset: function() {
			this._segment = undefined
			this.pos = 0
			this.finished = false
			this.error = false

			// clear ui
			presentation.segmentList = []
			presentation.len = 0
			presentation.pos = 0

			controlbar.noPlay = false
			controlbar.noPause = true
		},

		play: function() {

			// start loop
			this._startLoop()

			controlbar.noPlay = true
			controlbar.noPause = false
		},

		pause: function() {
			this._stopLoop()

			// update ui
			controlbar.noPlay = false
			controlbar.noPause = true
		},

		_startLoop: function() {
			var self = this
			if (this._loopHandle) {
				return
			}

			this._loopHandle = setInterval(function() {
				if (self.finished) {
					self._stopLoop()
				}
				else {
					self._step()
				}
			}, this._loopSpan)
		},

		_stopLoop: function() {
			if (!this._loopHandle) {
				return
			}
			clearInterval(this._loopHandle)
			this._loopHandle = undefined
		},

		_step: function() {
			if (!this.src) {
				throw new Error('[player] src?')
			}
			if (!this.txt) {
				throw new Error('[player] txt?')
			}
			if (typeof this.pos !== 'number' || this.pos < 0 || this.pos >= this.txt.length) {
				throw new Error('[player] invalid pos ' + this.pos)
			}
			

			if (this._segment === undefined) {
				this._segment = new Segment(this.src, this.txt, this.pos)
			}

			var _segment = this._segment

			_segment.next()

			// finished ?
			if (_segment.finished) {
				// error ?
				if (_segment.error) {
					this.finished = true
					this.error = true
				}
				// more ?
				else if ((_segment.winnerTokenizerPos + 1) < this.txt.length) {
					// create a new segment
					this._segment = new Segment(this.src, this.txt, _segment.winnerTokenizerPos + 1)
				}
				// eof
				else {
					// finished
					this.finished = true
					this.error = false
				}
			}
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
			},
			onPause: function(e) {
				player.pause()
			},
			onReset: function(e) {
				if (confirm('要重置状态吗？')) {
					player.reset()
				}
			}
		}
	})
})