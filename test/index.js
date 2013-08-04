var assert = require('assert')
var Promise = require('promise')
var ls = require('../')

function test(fn) {
  it('lists the files and folders in a directory', function (done) {
    var res = fn(__dirname + '/fixture')
    if (typeof res.buffer === 'function') res = res.buffer()
    res = Promise.from(res)
    res.then(function (res) {
      assert.deepEqual(res.map(function (stat) {
        return {
          path: stat.path,
          name: stat.name,
          isDirectory: stat.isDirectory()
        }
      }), [
        { path: './dir-a', name: 'dir-a', isDirectory: true },
        { path: './dir-b', name: 'dir-b', isDirectory: true },
        { path: './file-a.txt', name: 'file-a.txt', isDirectory: false },
        { path: './file-b.txt', name: 'file-b.txt', isDirectory: false },
        { path: './file-c.txt', name: 'file-c.txt', isDirectory: false },
        { path: './dir-a/file-a.txt', name: 'file-a.txt', isDirectory: false },
        { path: './dir-a/file-b.txt', name: 'file-b.txt', isDirectory: false },
        { path: './dir-b/file-b.txt', name: 'file-b.txt', isDirectory: false },
        { path: './dir-b/file-c.txt', name: 'file-c.txt', isDirectory: false }
      ])
    }).nodeify(done)
  })
  it('accepts a filter', function (done) {
    var res = fn(__dirname + '/fixture', {filter: function (stat) { return stat.isDirectory() }})
    if (typeof res.buffer === 'function') res = res.buffer()
    res = Promise.from(res)
    res.then(function (res) {
      assert.deepEqual(res.map(function (stat) {
        return {
          path: stat.path,
          name: stat.name,
          isDirectory: stat.isDirectory()
        }
      }), [
        { path: './dir-a', name: 'dir-a', isDirectory: true },
        { path: './dir-b', name: 'dir-b', isDirectory: true }
      ])
    }).nodeify(done)
  })
  it('accepts a filterPath', function (done) {
    var res = fn(__dirname + '/fixture', {filterPath: function (path) { return /^\.\/dir\-a/.test(path) }})
    if (typeof res.buffer === 'function') res = res.buffer()
    res = Promise.from(res)
    res.then(function (res) {
      assert.deepEqual(res.map(function (stat) {
        return {
          path: stat.path,
          name: stat.name,
          isDirectory: stat.isDirectory()
        }
      }), [
        { path: './dir-a', name: 'dir-a', isDirectory: true },
        { path: './dir-a/file-a.txt', name: 'file-a.txt', isDirectory: false },
        { path: './dir-a/file-b.txt', name: 'file-b.txt', isDirectory: false }
      ])
    }).nodeify(done)
  })
}

describe('ls(dirname, options, callback)', function () {
  test(ls)
})
describe('ls.sync(dirname, options)', function () {
  test(ls.sync)
})
describe('ls.stream(dirname, options)', function () {
  test(ls.stream)
})