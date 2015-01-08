# lsr

Recursive readdir (`ls -R`)

[![Build Status](https://img.shields.io/travis/ForbesLindesay/lsr/master.svg)](https://travis-ci.org/ForbesLindesay/lsr)
[![Dependency Status](https://img.shields.io/gemnasium/ForbesLindesay/lsr.svg)](https://gemnasium.com/ForbesLindesay/lsr)
[![NPM version](https://img.shields.io/npm/v/lsr.svg)](http://badge.fury.io/js/lsr)

## Installation

    npm install lsr

## Usage

```js
// Synchronous
console.dir(lsr.sync(__dirname))

// Node style callback
lsr(__dirname, function (err, res) {
  if (err) throw err
  console.dir(res)
})
lsr(__dirname, {filter: function (stat) { return stat.name != 'node_modules' }}, function (err, res) {
  if (err) throw err
  console.dir(res)
})

// Promise
lsr(__dirname).then(function (res) {
  console.dir(res)
})

// Stream
lsr.stream(__dirname).pipe(getPath()).pipe(process.stdout)
```

## API

Each file system entry is represented by a [Stat](http://nodejs.org/api/fs.html#fs_class_fs_stats) object with the additional properties:

 - `name`: the file name (e.g. `foo.txt`)
 - `path`: the relative path to the file (e.g. `./subdir/foo.txt`).  This is always separated by `/` regardless of platform.
 - `fullPath`: the full path to the file (e.g. `c:\\basedir\\foo.txt` or `/basedir/foo.txt`).  This is separated by the correct path separater for the platform.

### lsr(dir, options, callback)

Recursively lists the files and folders and calls the callback exactly once with the error or null as the first argument and an array of file system entries as the second argument.

Options:

 - ignoreErrors - if any stat calls result in an error, simply ignore that item
 - filter - a function that is called with a file sytem entry as its only argument and should return `true` to include that entry and any sub-entries in the result and `false` otherwise
 - filterPath - a function that is called with the `path` property of the file system entry (before the call to `fs.stat`) as its only argument and should return `true` to include that entry and any sub-entries in the result and `false` otherwise

If the callback is ommitted, a promise is returned instead.

### lsr.sync(dir, options)

Recursively lists the files and folders and returns an array of file system entries.

Options:

 - ignoreErrors - if any stat calls result in an error, simply ignore that item
 - filter - a function that is called with a file sytem entry as its only argument and should return `true` to include that entry and any sub-entries in the result and `false` otherwise
 - filterPath - a function that is called with the `path` property of the file system entry (before the call to `fs.stat`) as its only argument and should return `true` to include that entry and any sub-entries in the result and `false` otherwise

### lsr.stream(dir, options)

Recursively lists the files and folders and returns a stream of file system entries.

Options:

 - ignoreErrors - if any stat calls result in an error, simply ignore that item
 - filter - a function that is called with a file sytem entry as its only argument and should return `true` to include that entry and any sub-entries in the result and `false` otherwise
 - filterPath - a function that is called with the `path` property of the file system entry (before the call to `fs.stat`) as its only argument and should return `true` to include that entry and any sub-entries in the result and `false` otherwise
 - highWaterMark - the maximum number of file system entries to buffer before it should stop calling `readdir` and `stat` while it waits for the consuming stream to catch up

## License

  MIT
