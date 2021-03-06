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
	function Tokenizer(name, startTransitionFunction) {
		
		if (typeof startTransitionFunction !== 'function') {
			throw new Error('[Tokenizer] BUG: invalid arguments, startTransitionFunction is not function')			
		}

		this.name = name
		this.status = undefined
		this.nextTransitionFunction = startTransitionFunction
		this.length = 0
		this.startPos = undefined
	}

	Tokenizer.prototype.updateStatus = function(c, pos, eof) {
		var self = this

		// we can not update status if it's finished
		// so we need check the status and throw an error if failed

		checkCanUpdateStatusOrNot()

		// BUG check

		if (c === undefined && !eof) {
			throw new Error('[Tokenizer({{name}})] BUG: invalid arguments, c is undefined but eof is not true'.replace('{{name}}', self.name))
		}
		else if (c !== undefined && eof) {
			throw new Error('[Tokenizer({{name}})] BUG: invalid arguments, c is not undefined but eof is true'.replace('{{name}}', self.name))
		}
		if (pos < 0) {
			throw new Error('[Tokenizer({{name}})] BUG: invalid arguments, pos < 0'.replace('{{name}}', self.name))
		}

		if (this.startPos === undefined) {
			this.startPos = pos
		}

		try {
			var status = self.nextTransitionFunction(c, pos, eof)
		}
		catch (err) {
			debugger
			// this function must throw an exception
			throwErrorThrowedOnExecution(err)
		}

		// BUG check for returned status

		checkStatus(status)

		// update nextTransitionFunction

		if (status[0] === 'yes' && typeof status[1] === 'function') {
			self.nextTransitionFunction = status[1]
		}
		else {
			self.nextTransitionFunction = undefined
		}

		// update length

		if (status[0] === 'yes') {
			++self.length
		}
		else if (status[1] === 'success' && typeof status[2] === 'number') {
			self.length += status[2]
		}

		// remember the status

		self.status = status

		// throw a exception when failed

		function checkCanUpdateStatusOrNot() {
			if (self.status === undefined) {
				// there isn't any state transition before
				// it's ok
			}
			else if (self.status[0] === 'yes' && typeof self.status[1] === 'function') {
				// it's ok
			}
			else {
				// no, we can not update status any more
				var txt = '[Tokenizer({{name}})] BUG: you can not update status now'
						  .replace('{{name}}', self.name)
				throw new Error(txt)
			}
		}

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
								if (typeof status[2] === 'number' && status[2] <= 0) {
									// ['no', 'success', number]
									valid = true	
								}
							}
						}
					}
				}
			}

			if (!valid) {			
				// this function must throw an exception
				throwInvalidStatusReturned(status)
			}
		}

		function throwErrorThrowedOnExecution(err) {
			var txt = '[Tokenizer({{name}})] Error throwed on execution: {{error}}'
					  .replace('{{name}}', self.name)
					  .replace('{{error}}', err.toString())
			debugger
			throw new Error(txt)
		}

		function throwInvalidStatusReturned(status) {
			var txt = '[Tokenizer({{name}})] Invalid status returned: {{status}}'
					  .replace('{{name}}', self.name)
					  .replace('{{status}}', JSON.stringify(status))
			debugger
			throw new Error(txt)
		}
	}

	Tokenizer.prototype.isFailureStatus = function() {
		if (this.status === undefined) return false
		else if (this.status[0] === 'no' && this.status.length === 1) return true
		else return false
	}

	Tokenizer.prototype.isSuccessStatus = function() {
		if (this.status === undefined) return false
		else if (this.status[1] === 'success') return true
		else return false
	}

	Tokenizer.prototype.isContinueStatus = function() {
		if (this.status === undefined) return true
		else if (this.status[0] === 'yes' && typeof this.status[1] === 'function') return true
		else return false
	}

	// TokenizerGroup

	function TokenizerGroup(tokenizerList) {
		if (!Array.isArray(tokenizerList) || tokenizerList.length < 1) {
			throw new Error('[TokenizerGroup] BUG: invalid arguments, tokenizerList must be provided and not empty')
		}
		this.tokenizerList = tokenizerList
		this.continueList = tokenizerList
		this.successList = []
		this.failureList = []
	}

	TokenizerGroup.prototype.updateStatus = function(c, pos, eof) {
		if (this.continueList.length < 1) {
			throw new Error('[TokenizerGroup] BUG: you can not updateStatus() any more')
		}

		var nextContinueList = []

		this.continueList.forEach(function(tokenizer) {
			// update status on tokenizer
			tokenizer.updateStatus(c, pos, eof)
			// then we will put the tokenizer to different list
			if (tokenizer.isContinueStatus()) {
				nextContinueList.push(tokenizer)
			}
			else if (tokenizer.isSuccessStatus()) {
				this.successList.push(tokenizer)
			}
			else if (tokenizer.isFailureStatus()) {
				this.failureList.push(tokenizer)
			}
			else {
				debugger
				throw new Error('[TokenizerGroup] BUG: impossible tokenizer status')
			}
		}, this)

		var statusUpdatedTokenizerList = this.continueList
		this.continueList = nextContinueList

		return statusUpdatedTokenizerList
	}

	TokenizerGroup.prototype.isFailureStatus = function() {
		if (this.continueList.length === 0 && this.successList.length === 0) {
			if (this.failureList.length !== 0) {
				return true
			}
			else {
				throw new Error("[TokenizerGroup] continueList and successList and failureList is empty")
			}
		}
		else {
			return false
		}
	}

	TokenizerGroup.prototype.isSuccessStatus = function() {
		if (this.continueList.length === 0 && this.successList.length > 0) {
			return true
		}
		else {
			return false
		}
	}

	TokenizerGroup.prototype.isContinueStatus = function() {
		return this.continueList.length > 0
	}

	TokenizerGroup.prototype.getWinner = function() {
		if (!this.isSuccessStatus()) {
			throw new Error('[TokenizerGroup] if you want to getWinner() current status must be success')
		}

		var winner = this.successList[0]
		for (var i = 1, len = this.successList.length; i < len; ++i) {
			if (this.successList[i].length > winner.length) {
				winner = this.successList[i]
			}
		}

		return winner
	}

	// Segment

	function Segment(tokenizerGroup) {
		if (!tokenizerGroup) {
			throw new Error('[Segment] invalid arguments, tokenizerGroup must be provided')
		}

		this.tokenizerGroup = tokenizerGroup
		this.findTokenizerVM = {}

		var _segmentVM = {
			charList: [],
			indexList: [],
			tokenizerList: tokenizerGroup.tokenizerList.map(function(tokenizer) {
				var _ = {
					name: tokenizer.name,
					statusList: [],
					isWinner: false
				}
				this.findTokenizerVM[tokenizer.name] = _
				return _
			}, this)
		}

		presentation.segmentList.push(_segmentVM)

		this._segmentVM = _segmentVM
	}

	Segment.prototype.updateStatus = function(c, pos, eof) {
		var statusUpdatedTokenizerList = this.tokenizerGroup.updateStatus(c, pos, eof)
		if (!statusUpdatedTokenizerList || statusUpdatedTokenizerList.length < 0) {
			throw new Error('[Segment] BUG: invalid result return from tokenizerGroup.updateStatus()')
		}
		// update ui
		
		if (eof) {
			this._segmentVM.charList.push(charOf(undefined))
			this._segmentVM.indexList.push('eof')
		}
		else {
			this._segmentVM.charList.push(charOf(c))
			this._segmentVM.indexList.push(pos)			
		}

		statusUpdatedTokenizerList.forEach(function(tokenizer) {
			var tokenizerVM = this.findTokenizerVM[tokenizer.name]
			tokenizerVM.statusList.push(tokenizer.status[0])
		}, this)

		// mark winner ui as needed
		if (this.tokenizerGroup.isSuccessStatus()) {
			var winner = this.tokenizerGroup.getWinner()
			var winnerVM = this.findTokenizerVM[winner.name]
			winnerVM.isWinner = true
		}


		function charOf(v) {
			return {
				codePoint: v === undefined ? 'eof' : '0x' + v.charCodeAt(0).toString(16).toUpperCase(),
				text: v
			}
		}
	}

	Segment.prototype.isFailureStatus = function() {
		return this.tokenizerGroup.isFailureStatus()
	}

	Segment.prototype.isSuccessStatus = function() {
		return this.tokenizerGroup.isSuccessStatus()
	}

	Segment.prototype.isContinueStatus = function() {
		return this.tokenizerGroup.isContinueStatus()
	}

	Segment.prototype.getWinner = function() {
		return this.tokenizerGroup.getWinner()
	}

	function Player(src, txt, pos) {

		if (!src || src.length < 1) {
			throw new Error('[Player] invalid arguments, src?')
		}
		if (!txt || txt.length < 1) {
			throw new Error('[Player] invalid arguments, txt?')
		}
		if (typeof pos !== 'number' || pos < 0 || pos >= txt.length) {
			throw new Error('[Player] invalid arguments, invalid pos ' + pos)
		}

		var self = this

		this._loopSpan = 50
		this._loopHandle = undefined
		this._segment = undefined
		this.src = src
		this.txt = txt
		this.pos = pos || 0
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
		if (reason !== 'success' && reason !== 'failure' && reason !== 'user' && reason !== 'error') {
			throw new Error('[Player] BUG: invalid arguments, reason can be success, failure, user or error, not "' + reason + '"')
		}
		if (this.onStatusChanged) {
			this.onStatusChanged({
				status: 'stopped.' + reason,
				detail: detail
			})
		}
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

		var c = this.txt[this.pos]
		var pos = this.pos
		var eof = this.pos >= this.txt.length

		// BUG check

		if (!this._segment) {
			// first time to step, we need create an segment
			this._segment = new Segment(compile(this.src))
		}
		else if (this._segment.isSuccessStatus()) {
			if (eof) {
				throw new Error('[Player] BUG: last segment is success and we have reach the end of text, you can not step any more')
			}
			else {
				// ok, we should create an new segment, cause there are more text to process
				this._segment = new Segment(compile(this.src))
			}
		}
		else if (this._segment.isFailureStatus()) {
			throw new Error('[Player] BUG: last segment failed, you can not step any more')
		}
		else if (this._segment.isContinueStatus()) {
			// do nothing, continue use current segment
		}
		else {
			debugger
			throw new Error('[Player] BUG: impossible status')
		}

		// update ui
		presentation.pos = pos
		presentation.len = this.txt.length

		try {
			this._segment.updateStatus(c, pos, eof)
		}
		catch (err) {
			debugger
			this._stopLoop()
			this._stoppedStatus('error', err)
		}

		// check segment status

		if (this._segment.isFailureStatus()) {
			this._stopLoop()
			this._stoppedStatus('failure')
		}
		else if (this._segment.isSuccessStatus()) {
			if (eof || this.pos >= (this.txt.length - 1)) {
				this._stopLoop()
				this._stoppedStatus('success')
			}
			else {
				// it's ok
				// we will create an new segment next step
				// move pos forward
				var winnerTokenizer = this._segment.getWinner()
				this.pos = winnerTokenizer.startPos + winnerTokenizer.length
			}
		}
		else if (this._segment.isContinueStatus()) {
			// it's ok
			// move pos forward
			++this.pos
		}
		else {
			debugger
			throw new Error('[Player] BUG: impossible status')
		}


		function compile(src) {
			var tokenizerList = []
			var nameExisted = {}	// detect duplicated name
			var fun = new Function('tokenizer', '"use strict";\n' + src)
			fun(addTokenizer)
			return new TokenizerGroup(tokenizerList)

			function addTokenizer(name, startTransitionFunction) {
				if (typeof name !== 'string') {
					throw new Error('[Player.compile] tokenizer name must be string')
				}
				else if (name === '') {
					throw new Error('[Player.compile] tokenizer name can not be empty')
				}
				else if (nameExisted[name]) {
					throw new Error('[Player.compile] duplicated tokenizer name detected: ' + name)
				}
				else {
					nameExisted[name] = true
				}

				if (typeof startTransitionFunction !== 'function') {
					throw new Error('[Player.compile] startTransitionFunction must be function')					
				}

				tokenizerList.push(new Tokenizer(name, startTransitionFunction))
			}
		}
	}

	var player

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

				// save to local storage
				if (localStorage) {
					localStorage.setItem('src', src)
					localStorage.setItem('txt', txt)
				}

				if (!player) {
					// clear UI
					presentation.len = 0
					presentation.pos = 0
					presentation.segmentList = []

					player = new Player(src, txt, 0)
					player.onStatusChanged = function(to) {
						// debug
						//alert(to.status)
						switch (to.status) {
							case 'playing':
								self.noPlay = true
								self.noPause = false
								break
							case 'paused':
								self.noPlay = false
								self.noPause = true
								break
							case 'stopped.success':
								self.noPlay = false
								self.noPause = true
								// drop player
								player.onStatusChanged = undefined
								player = undefined
								break
							case 'stopped.failure':
								self.noPlay = false
								self.noPause = true
								// drop player
								player.onStatusChanged = undefined
								player = undefined
								break
							case 'stopped.error':
								console.log(to.detail)
								self.noPlay = false
								self.noPause = true
								// drop player
								player.onStatusChanged = undefined
								player = undefined
								break
							case 'stopped.user':
								self.noPlay = false
								self.noPause = true
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

						// init tooltip
						setTimeout(function() {
							$('[data-toggle=tooltip]').tooltip()
						}, 0)
					}
				}

				player.play()
			},
			onPause: function(e) {
				if (!player) throw new Error('BUG: player not exists but \"pause\"" button is enabled')
				player.pause()
			},
			onReset: function(e) {
				if (confirm('要复位吗？')) {
					if (player) {
						player.stop()
						player = undefined
					}
					// clear UI
					presentation.len = 0
					presentation.pos = 0
					presentation.segmentList = []
				}
			}
		}
	})
})

// auto load
$(function() {
	if (localStorage) {
		var src = localStorage.getItem('src')
		var txt = localStorage.getItem('txt')

		srcEditor.setValue(src || '')
		txtEditor.setValue(txt || '')
	}
})
