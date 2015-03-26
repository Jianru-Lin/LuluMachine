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
		this.failed = undefined
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
			fun(registerTokenizer)
			return list

			function registerTokenizer(name, fun) {
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
			var tokenizerFinished = tokenizer.accept || tokenizer.reject
			if (!tokenizerFinished) {
				var status = tokenizer.fun(c, this.pos, eof)
				switch (status[0]) {
					// ['accept', pos]
					case 'accept':
						status[1] = status[1] !== undefined ? status[1] : this.pos
						tokenizer.fun = null
						break;
					// ['accept+', fun]
					case 'accept+':
						if (typeof status[1] !== 'function') {
							throw new Error('[Segment] invalid tokenizer status, function is missing')
						}
						tokenizer.fun = status[1]
						break;
					// ['reject']
					case 'reject':
						tokenizer.fun = null
						break;
					// ['suspect', fun]
					case 'suspect':
						if (typeof status[1] !== 'function') {
							throw new Error('[Segment] invalid tokenizer status, function is missing')
						}
						tokenizer.fun = status[1]
						break;
					default:
						throw new Error('[Segment] unknown tokenizer status - ' + status[0])
				}

				tokenizer[status[0]] = true
				tokenizer.status = status

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
			return tokenizer.accept || tokenizer.reject
		})

		// MUST: eof ==> everyTokenizerFinished
		if (eof && !everyTokenizerFinished) {
			throw new Error('[Segment] invalid tokenizer detected, did not finished on eof')
		}

		if (everyTokenizerFinished) {

			// finished

			this.finished = true

			// find winner tokenizer

			this.winnerTokenizer = undefined
			this.tokenizerList.forEach(function(tokenizer) {
				if (tokenizer.status[0] !== 'accept') return
				if (this.winnerTokenizer === undefined) {
					this.winnerTokenizer = tokenizer
				}
				else {
					var tokenizerPos = tokenizer.status[1]
					var winnerTokenizerPos = this.winnerTokenizer.status[1]
					if (tokenizerPos > winnerTokenizerPos) {
						this.winnerTokenizer = tokenizer
					}
				}
			}, this)

			// failed - every tokenizer rejected ?

			if (this.winnerTokenizer === undefined) {
				// finished, but failed
				this.failed = true
			}
			else {
				this.winnerTokenizerPos = this.winnerTokenizer.status[1]
			}
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
				var statusName = tokenizer.status[0].replace('+', '-plus')
				tokenizerVM.statusList.push(statusName)
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

		stop: function() {
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
				// failed ?
				if (_segment.failed) {
					this.finished = true
					this.error = true
				}
				// success and more ?
				else if ((_segment.winnerTokenizerPos + 1) < this.txt.length) {
					// create a new segment
					this._segment = new Segment(this.src, this.txt, _segment.winnerTokenizerPos + 1)
				}
				// success and eof ?
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
			onStop: function(e) {
				if (confirm('要停止吗？')) {
					player.stop()
				}
			}
		}
	})
})