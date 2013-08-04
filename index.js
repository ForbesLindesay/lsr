'use strict'

var fs = require('fs')
var path = require('path')
var Promise = require('promise')
var barrage = require('barrage')
var join = path.join

module.exports = lsrAsync
module.exports.sync = lsrSync
module.exports.stream = lsrStream

function lsrSync(dir, options) {
  options = options || {}
  var directories = ['']
  var result = []
  while (directories.length) {
    var subdir = directories.shift()
    fs.readdirSync(join(dir, subdir))
      .forEach(function (entry) {
        if (options.filterPath && !options.filterPath('.' + subdir + '/' + entry)) return
        try {
          var stat = fs.statSync(join(dir, subdir, entry))
        } catch (ex) {
          if (options.ignoreErrors) return
          else throw ex
        }
        stat.path = '.' + subdir + '/' + entry
        stat.fullPath = join(dir, subdir, entry)
        stat.name = entry
        if (options.filter && !options.filter(stat)) return
        if (stat.isDirectory()) {
          directories.push(subdir + '/' + entry)
        }
        result.push(stat)
      })
  }
  return result
}

function lsrAsyncBase(dir, options, push, end, reject, lazy) {
  var directories = ['']
  function rec1() {
    if (directories.length === 0) return end()
    var subdir = directories.shift()
    fs.readdir(join(dir, subdir), function (err, entries) {
      if (err) return reject(err)
      entries.reverse()
      function rec2() {
        if (entries.length === 0) return rec1()
        var entry = entries.pop()
        if (options.filterPath && !options.filterPath('.' + subdir + '/' + entry)) return rec2()
        fs.stat(join(dir, subdir, entry), function (err, stat) {
          if (err && options.ignoreErrors) return rec2()
          if (err) return reject(err)
          stat.path = '.' + subdir + '/' + entry
          stat.fullPath = join(dir, subdir, entry)
          stat.name = entry
          if (options.filter && !options.filter(stat)) return rec2()
          if (stat.isDirectory()) {
            directories.push(subdir + '/' + entry)
          }
          push(stat)
          lazy(rec2)
        })
      }
      lazy(rec2)
    })
  }
  rec1()
}

function lsrAsync(dir, options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = undefined
  }
  options = options || {}
  return new Promise(function (resolve, reject) {
    var result = []
    lsrAsyncBase(dir, options, result.push.bind(result), resolve.bind(this, result), reject, function (fn) { fn() })
  }).nodeify(callback)
}

function lsrStream(dir, options) {
  options = options || {}
  var result = new barrage.Readable({objectMode: true, highWaterMark: options.highWaterMark})
  var cont = true
  var lazy = function () {
    lsrAsyncBase(dir, options, function (entry) {
      cont = result.push(entry)
    }, function () {
      result.push(null)
    }, result.emit.bind(result, 'error'), function (fn) {
      if (cont) fn()
      else lazy = fn
    })
  }
  result._read = function () {
    cont = true
    if (lazy) {
      var fn = lazy
      lazy = null
      fn()
    }
  }
  return result
}