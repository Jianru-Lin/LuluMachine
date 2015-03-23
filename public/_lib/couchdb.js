;(function(context) {
    // alias
    var encuc = encodeURIComponent
    var decuc = decodeURIComponent
    
    // # cb(status, headers, body)
    function ajax(method, url, headers, body, cb) {
        cb = cb || function() {}
        url = relativeTo(ajax.base, url)
        var req = new XMLHttpRequest()
        req.onreadystatechange = onChange
        req.open(method, url)
        // 设置各个头部字段
        if (headers) {
            for (var k in headers) {
                req.setRequestHeader(k, headers[k])
            }
        }
        if (body) {
            req.send(body)
        }
        else {
            req.send()
        }
        return req
        
        function onChange() {
            if (req.readyState !== 4) {
                return
            }
            var status = {
                code: req.status,
                text: req.statusText
            }
            var headers = req.getAllResponseHeaders()
            cb(status, headers, req.responseText)
        }

        function relativeTo(base, url) {
            if (!base) {
                return url
            }
            else if (/^http(s)?:\/\/.test(url)/i.test(url)) {
                return url
            }
            else {
                return base + url
            }
        }
    }

    ajax.base = ''

    ajax.get = function(url, headers, cb) {
        return ajax('GET', url, headers, undefined, cb)
    }

    ajax.post = function(url, headers, body, cb) {
        return ajax('POST', url, headers, body, cb)
    }

    ajax.put = function(url, headers, body, cb) {
        return ajax('PUT', url, headers, body, cb)
    }

    ajax['delete'] = function(url, headers, cb) {
        return ajax('DELETE', url, headers, undefined, cb)
    }

    // essential
    
    context.couchdb = {
        get base() {
            return ajax.base
        },
        set base(v) {
            var old = ajax.base
            ajax.base = v
            return old
        },
        debug: function(status, headers, body) {},
        // # cb(status, headers, resObj)
        get: function(url, headers, cb) {
            ajax.get(url, headers, this._cbProxy(cb))
        },
        // # cb(status, headers, resObj)
        post: function(url, headers, reqObj, cb) {
            // reqObj is optional
            // set content-type always, or we will fail in some cases
            headers = headers || {}
            headers['Content-Type'] = 'application/json;charset=utf-8'
            if (reqObj) {
                ajax.post(url, headers, JSON.stringify(reqObj), this._cbProxy(cb))
            }
            else {
                ajax.post(url, headers, undefined, this._cbProxy(cb))
            }
        },
        // # cb(status, headers, resObj)
        put: function(url, headers, reqObj, cb) {
            // reqObj is optional
            if (reqObj) {
                headers = headers || {}
                headers['Content-Type'] = 'application/json;charset=utf-8'
                ajax.put(url, headers, JSON.stringify(reqObj), this._cbProxy(cb))
            }
            else {
                ajax.put(url, headers, undefined, this._cbProxy(cb))
            }
        },
        // # cb(status, headers, resObj)
        'delete': function(url, headers, cb) {
            ajax['delete'](url, headers, this._cbProxy(cb))
        },
        _cbProxy: function(cb) {
            var self = this
            return function(status, headers, body) {
                try {
                    body = JSON.parse(body)
                }
                catch (err) {
                    console.error(err)
                    body = undefined
                }
                if (cb) cb(status, headers, body)
        
                // debug purpose only

                if (self.debug) {
                    self.debug(status, headers, body)
                }
            }
        }
    }

    // extension

    var couchdb = context.couchdb
    
    // #cb(status, headers, resObj)
    couchdb._uuids = function(count) {
        
        return {
            get: function(cb) {
                var query = (count !== undefined ? ('?count=' + encuc(count)) : '')
                couchdb.get('/_uuids' + query, null, cb)
            }
        }
    }

    couchdb._session = function() {
        var _session_args = arguments
        return {
            get: function(opt, cb) {
                var query = obj2query(opt)
                couchdb.get('/_session' + query, null, cb)
            },
            // _session(obj).post(opt, cb)
            post: function(opt, cb) {
                var obj = _session_args[0]
                var query = obj2query(opt)
                couchdb.post('/_session' + query, null, obj, cb)
            },
            'delete': function(opt, cb) {
                var query = obj2query(opt)
                couchdb['delete']('/_session' + query, null, cb)
            }
        }
    }

    couchdb.db = function(name) {
        var db_args = arguments

        return {
            doc: function() {
                var doc_args = arguments
                return {
                    head: undefined,    // TODO
                    // doc(docid).get(opt, cb)
                    get: function(opt, cb) {
                        var query = obj2query(opt)
                        var docid = doc_args[0]
                        var url = '/' + name + '/' + docid + query
                        couchdb.get(url, null, cb)
                    },
                    // doc(doc).put(opt, cb)
                    put: function(opt, cb) {
                        var query = obj2query(opt)
                        var doc = doc_args[0]
                        var url = '/' + name + '/' + doc._id + query
                        couchdb.put(url, null, doc, cb)
                    },
                    // doc(doc).delete(opt, cb)
                    'delete': function(opt, cb) {
                        var doc = doc_args[0]
                        var query = obj2query(opt, {rev: doc._rev})
                        var url = '/' + name + '/' + doc._id + query
                        couchdb['delete'](url, null, cb)
                    }
                }
            },
            
            _design: function() {
                var _design_args = arguments

                return {

                    head: undefined,    // TODO
                    
                    // _design(docid).get(opt, cb)
                    get: function(opt, cb) {
                        var docid = _design_args[0]
                        var url = '/' + encuc(name) + '/' + encuc(docid) + obj2query(opt)
                        couchdb.get(url, undefined, cb)
                    },

                    // _design(ddoc).put(opt, cb)
                    put: function(opt, cb) {
                        var ddoc = _design_args[0]
                        var url = '/' + encuc(name) + '/' + encuc(ddoc._id) + obj2query(opt)
                        couchdb.put(url, undefined, ddoc, cb)
                    },

                    // _design(ddoc).delete(opt, cb)
                    // ddoc: {_id, _rev}
                    'delete': function(opt, cb) {
                        var ddoc = _design_args[0]
                        var _id = ddoc._id
                        var _rev = ddoc._rev
                        var url = '/' + encuc(name) + '/' + encuc(_id) + obj2query(opt, {rev: _rev})
                        couchdb['delete'](url, undefined, cb)
                    },

                    attachment: function(name) {
                        // TODO
                        return {
                            head: undefined,
                            get: undefined,
                            put: undefined,
                            'delete': undefined
                        }
                    },

                    _info: function() {
                        // TODO
                        return {
                            head: undefined,
                            get: undefined,
                            put: undefined,
                            'delete': undefined
                        }
                    },
                    
                    _view: function() {
                        var _view_args = arguments
                        return {
                            // _view(name, req).post(opt, cb)
                            get: function(opt, cb) {
                                var dbName = db_args[0]
                                var designId = _design_args[0]
                                var viewName = _view_args[0]
                                var query = obj2query(opt)
                                var url = '/' + encuc(dbName) + '/' + encuc(designId) + '/_view/' + encuc(viewName) + query
                                couchdb.get(url, null, cb)
                            },
                            // _view(name, req).post(opt, cb)
                            post: function(opt, cb) {
                                var dbName = db_args[0]
                                var designId = _design_args[0]
                                var viewName = _view_args[0]
                                var req = _view_args[1]
                                var query = obj2query(opt)
                                var url = '/' + encuc(dbName) + '/' + encuc(designId) + '/_view/' + encuc(viewName) + query
                                couchdb.post(url, null, req, cb)
                            }
                        }
                    },
                    
                    _show: function() {
                        // TODO
                    },
                    
                    _list: function() {
                        // TODO
                    },
                    
                    _update: function() {
                        // TODO
                    },
                    
                    _rewrite: function() {
                        // TODO
                    }
                }
            }
        }

    }
    
    // alias
    
    couchdb.signin =function(name, password, cb) {
        var reqObj = {
            name: name, 
            password: password
        }
        couchdb._session(reqObj).post(null, cb)
    }
    
    couchdb.signout = function(cb) {
        couchdb._session()['delete'](null, cb)
    }
    
    // you can provide multiple obj
    function obj2query() {
        if (arguments.length < 1) {
            return ''
        }
        var query = []
        for (var i = 0, len = arguments.length; i < len; ++i) {
            obj = arguments[i] || {}
            for (var name in obj) {
                var value = obj[name]
                query.push(encuc(name) + '=' + encuc(value))
            }
        }
        query = query.join('&')
        query = query ? ('?' + query) : query
        return query
    }
})(window);

// for current project

window.couchdb.base = '/relax'