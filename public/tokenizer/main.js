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

		this.txt = txt
		this.pos = pos
		this.finished = false

		this.tokenizerList = init(src)
		
		var c = txt[pos]

		// add an new segment to the UI

		presentation.segmentList.push({
			charList: [c],
			indexList: [pos],
			tokenizerList: this.tokenizerList.map(function(tokenizer) {
				return {
					name: tokenizer.name,
					statusList: []
				}
			})
		})

		// remember the segmentVM

		this.segmentVM = presentation.segmentList[presentation.segmentVM.length - 1]

		function init(src) {
			var list = []
			var fun = new Function('tokenizer', src)
			fun(setupTokenizer)

			function setupTokenizer = function(name, fun) {
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

		// get current character, if it's undefined, it means EOF

		var c = this.txt[this.pos]
	
		// invoke every tokenizer

		this.tokenizerList = this.tokenizerList.map(function(tokenizer) {
			if (!tokenizer.finished) {
				var v = tokenizer.fun(c)
				if (typeof v === 'function') {
					tokenizer.fun = v
				}
				else {
					tokenizer.finished = true
					tokenizer.result = v
				}
				showTokenizerStatus(tokenizer)
			}
		})

		// check if finished

		this.finished = c === undefined || this.tokenizerList.every(function(tokenizer) {
			return tokenizer.finished
		})

		function showTokenizerStatus(tokenizer) {
			var segmentVM = self.segmentVM
			var tokenizerVM
			for (var i = 0, len = segmentVM.length; i < len; ++i) {
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

		_loopSpan: 1000,
		_loopHandle: undefined,
		_segment: undefined,
		src: undefined,
		txt: undefined,

		reset: function() {
			// TODO
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
			this._loopHandle = setInterval(this.step.exec.bind(this.step), this._loopSpan)
		},

		_stopLoop: function() {
			if (!this._loopHandle) {
				return
			}
			clearInterval(this._loopHandle)
			this._loopHandle = undefined
		},

		step: {
			_nextPos: 0,
			_segment: undefined,
			_tokenizerMap: undefined,
			_lastStepState: undefined,

			exec: function() {
				var self = this
				console.log('step ' + new Date())

				var c = self._txt[self._nextPos]
				if (c === undefined) {
					// return false means no more step
					return false
				}

				if (self._segment === undefined) {
					self._tokenizerMap = {}
					var segment = self._segment = {
						charList: [c],
						indexList: [self._nextPos],
						tokenizerList: self.tokenizerList.map(function(tokenizer) {
							var tokenizerUI = {
								name: tokenizer.name,
								statusList: []
							}
							// remember the relation
							self._tokenizerMap[tokenizer.name] = tokenizerUI
							return tokenizerUI
						})
					}
					presentation.segmentList.push(segment)
				}
				else {
					var segment = self._segment
					segment.charList.push(c)
					segment.indexList.push(self._nextPos)
				}

				if (!self._lastStepState) {
					self._lastStepState = self.tokenizerList.map(function(tokenizer) {
						var state = {
							name: tokenizer.name,
							lastRet: tokenizer.def(c)
						}
						return state
					})
				}
				else {
					self._lastStepState = this.
				}

				// TODO
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