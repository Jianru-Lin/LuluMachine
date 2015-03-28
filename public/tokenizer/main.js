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

	// every step, tokenizer can return:
	// -------------------------------------------------
	// [AcceptCurrentChar?, Then?(opt), Arg?(opt)]
	// AcceptCurrentChar? :: 'yes' | 'no'
	// Then? :: 'success' | 'failure'
	// Args? :: number
	// -------------------------------------------------
	// expamles:
	// ['no']					=> shortcut for ['no', 'failure'] means reject current char and entire tokenizer is failed
	// ['no', 'success']		=> shortcut for ['no', 'success', -1] means reject current char but all the chars from {{head}} to {{current-1}} is successfully
	// ['no', 'success', -n]	=> means reject current char but all the chars from {{head}} to {{current-n}} is successfully
	// ['yes', fun]				=> means accept current char and continue
	// ['yes', 'success']		=> means accept current char and successfully
	// -------------------------------------------------
	// so we can meet such an sequence likes below
	// [['yes'], ['yes'], ['yes', 'success']],
	// [['yes'], ['yes'], ['no', 'success', 12]],
	// [['yes'], ['yes'], ['no', 'success']],
	// [['yes'], ['no']]
	function playTokenizer(tokenizer, c, pos, eof) {

		// BUG check

		if (!tokenizer) {
			throw new Error('[playTokenizer] BUG: invalid arguments, tokenizer is not provided')
		}
		else if (typeof tokenizer.fun !== 'function') {
			throw new Error('[playTokenizer] BUG: invalid arguments, tokenizer.fun is not function')			
		}

		if (c === undefined && !eof) {
			throw new Error('[playTokenizer] BUG: invalid arguments, c is undefined but eof is not true ')
		}
		else if (c !== undefined && eof) {
			throw new Error('[playTokenizer] BUG: invalid arguments, c is not undefined but eof is true')
		}
		if (pos < 0) {
			throw new Error('[playTokenizer] BUG: invalid arguments, pos < 0')
		}

		try {
			var status = tokenizer.fun(c, pos, eof)
		}
		catch (err) {
			// this function must throw an exception
			throwErrorOnExecTokenizer(tokenizer, err)
		}

		// BUG check for returned status
		checkStatus(status)

		return status

		// throw a exception when failed
		function checkStatus(status) {
			
			// status[0] must be 'yes' or 'no'
			// when status[0] is 'yes', status[1] must be 'success' or a function
			// when status[0] is 'no', status[1] can be omitted
			// but if status[1] exists, it must be 'success' or 'failure'
			// then if status[1] is 'success', status[2] can be omitted or an negtive number (non-zero)

			var valid = false

			if (Array.isArray(status)) {
				if (status.length > 0) {
					if (status[0] === 'yes') {
						if (status.length === 2) {
							if (status[1] === 'success' || typeof status[1] === 'function') {
								// ['yes', 'success']
								// ['yes', function() {}]
								valid = true
							}
						}
					}
					else if (status[0] === 'no') {
						if (status.length === 1) {
							// ['no']
							valid = true
						}
						else if (status[1] === 'success') {
							if (status.length === 2) {
								// ['no', 'success']
								valid = true
							}
							else if (status.length === 3) {
								if (typeof status[2] === 'number')
								// ['no', 'success', number]
								valid = true
							}
						}
					}
				}
			}

			if (!valid) {			
				// this function must throw an exception
				throwInvalidStatusReturnedFromTokenizer(tokenizer, status)
			}
		}

		function throwErrorOnExecTokenizer(tokenizer, err) {
			var txt = 'Error throwed on execution tokenizer\n'
					+ '[name]\n' + tokenizer.name + '\n'
					+ '[error]\n' + err.toString() + '\n'
			throw new Error(txt)
		}

		function throwInvalidStatusReturnedFromTokenizer(tokenizer, status) {
			var txt = 'Invalid status returned from tokenizer\n'
					+ '[name]\n' + tokenizer.name + '\n'
					+ '[status]\n' + JSON.stringify(status)) + '\n'
			throw new Error(txt)
		}
	}

	// return: [statusList]
	function playTokenizerList(tokenizerList, c, pos, eof) {

		// BUG check

		if (!tokenizerList || tokenizerList.length < 1) {
			throw new Error('[playTokenizerList] BUG: invalid arguments, tokenizerList must be provided and not empty')
		}

		// we don't check other arguments here
		// underlying TokenizerPlayer will check
		// this is low performance we wish to fix this later

		var statusList = tokenizerList.map(function(tokenizer) {
			return playTokenizer(tokenizer, c, pos, eof)
		})
	}

	// 
	function playSegment(tokenizerList, text, pos) {

		if (!text) {
			throw new Error('[playSegment] BUG: invalid arguments, text must be provided and not empty')
		}
		if (typeof pos !== 'number' || pos < 0 || pos >= text.length) {
			throw new Error('[playSegment] BUG: invalid arguments, pos must be number and in range [0, ' + text.length '), current is ' + pos)
		}

		var c = text[pos]
		var eof = pos === text.length
		var statusList = playTokenizerList(tokenizerList, c, pos, eof)

		// 
		var done = true
		var winnerStatus
		var error
		statusList.forEach(function(status, i) {
			if (done && status[0] === 'success' && typeof status[1] === 'function') {
				done = false
			}
		})
	}

	function playText(tokenizerList, text) {

	}

	// TokenPlayer

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

	Segment.prototype.play = function() {

	}

	Segment.prototype.pause = function() {

	}

	Segment.prototype.stop = function() {

	}

	// TextPlayer

	function Player(src, txt, pos) {
		this._loopSpan = 100,
		this._loopHandle = undefined,
		this._segment = undefined,
		this.src = src,
		this.txt = txt,
		this.pos = pos || 0,
		this._finished = false,
		this._error = false,
		this.onStatusChanged = function(status) {}
	}

	Player.prototype.play = function() {
		// start loop
		this._startLoop()
		this._playingStatus()
	}

	Player.prototype.stop = function() {
		this._segment = undefined
		this.pos = 0
		this._stopLoop()
		this._stoppedStatus('user')
	}

	Player.prototype.pause = function() {
		this._stopLoop()
		this._pausedStatus()
	}

	Player.prototype._playingStatus = function() {
		this.onStatusChanged({
			status: 'playing'
		})
	}

	Player.prototype._pausedStatus = function() {
		this.onStatusChanged({
			status: 'paused'
		})
	}

	Player.prototype._stoppedStatus = function(reason, detail) {
		if (reason !== 'eof' && reason !== 'user' && reason !== 'error') {
			throw new Error('BUG: unknown reason "' + reason + '"')
		}
		this.onStatusChanged({
			status, 'stopped.' + reason,
			detail: detail
		})
	}

	Player.prototype._startLoop = function() {
		var self = this
		if (this._loopHandle) {
			return
		}

		this._loopHandle = setInterval(function() {
			self._step()
		}, this._loopSpan)
	}

	Player.prototype._stopLoop = function() {
		if (!this._loopHandle) {
			return
		}
		clearInterval(this._loopHandle)
		this._loopHandle = undefined
	}

	Player.prototype._step = function() {
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

		var status = _segment.next()

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

	var player = undefined

	var controlbar = window.controlbar = new Vue({
		el: '.controlbar',
		data: {
			noPlay: false,
			noPause: true,
		},
		methods: {
			onPlay: function(e) {
				var self = this
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

				if (!player) {
					player = new Player(src, txt, 0)
					player.onStatusChanged = function(to) {
						switch (to.status) {
							case 'playing':
								self.noPlay = true
								self.noPause = false
								self.noStop = true
								break
							case 'paused':
								self.noPlay = false
								self.noPause = true
								self.noStop = false
								break
							case 'stopped.eof':
								break
							case 'stopped.error':
								break
							case 'stopped.user':
								self.noPlay = false
								self.noPause = true
								self.noStop = true
								// clear UI
								presentation.len = 0
								presentation.pos = 0
								presentation.segmentList = []
								// drop player
								player.onStatusChanged = undefined
								player = undefined
								break
							default:
								throw new Error('unknown player status: ' + to.status)
						}
					}
				}
				else {
					player.play()
				}
			},
			onPause: function(e) {
				if (!player) throw new Error('BUG: player not exists but \"pause\"" button is enabled')
				player.pause()
			},
			onStop: function(e) {
				if (!player) throw new Error('BUG: player not exists but \"pause\"" button is enabled')
				if (confirm('要停止吗？')) {
					player.stop()
				}
			}
		}
	})
})