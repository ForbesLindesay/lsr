'use strict'

import {readdirSync, readdir, statSync, stat} from 'fs';
import {join} from 'path';
import Promise = require('promise');
var barrage = require('barrage')

export interface FileSystemEntry {
  isFile(): boolean;
  isDirectory(): boolean;
  isBlockDevice(): boolean;
  isCharacterDevice(): boolean;
  isSymbolicLink(): boolean;
  isFIFO(): boolean;
  isSocket(): boolean;
  dev: number;
  ino: number;
  mode: number;
  nlink: number;
  uid: number;
  gid: number;
  rdev: number;
  size: number;
  blksize: number;
  blocks: number;
  atime: Date;
  mtime: Date;
  ctime: Date;
  birthtime: Date;

  /**
   * The filename, e.g. "index.js"
   */
  name: string;

  /**
   * The asbolute path to the file. Uses "/" on unix and "\\" on most windows. e.g. "C:\\\\Users\\Forbes Lidnesay\File.js"
   */
  fullPath: string;

  /**
   * The path relative to the starting directory.  e.g. "path/to/file.js"
   * 
   * N.B. "\\" is normalized to "/" even on windows.
   */
  path: string;
}
interface FSInfo {
  name: string;
  fullPath: string;
  path: string;
}

function addFileSystemInfo(stat: any, info: FSInfo): FileSystemEntry {
  stat.name = info.name;
  stat.fullPath = info.fullPath;
  stat.path = info.path;
  return stat;
}

function tryStatSync(filename: string) {
  try {
    return statSync(filename);
  } catch (ex) {
    return null;
  }
}
export interface Options {
  filterPath?: (path: string) => boolean;
  filter?: (entry: FileSystemEntry) => boolean;
  highWaterMark?: number;
  ignoreErrors?: boolean;
}
export function lsrSync(dir: string, options: Options = {}): Array<FileSystemEntry> {
  var directories: Array<string> = ['']
  var result: Array<FileSystemEntry> = []
  while (directories.length) {
    const subdir = <string>directories.shift();
    readdirSync(join(dir, subdir))
      .forEach(function (entry) {
        if (options.filterPath && !options.filterPath('.' + subdir + '/' + entry)) return
        const fullPath = join(dir, subdir, entry);
        const stat = (
          options.ignoreErrors
            ? tryStatSync(fullPath)
            : statSync(fullPath)
        );
        if (!stat) {
          return;
        }
        const fsEntry = addFileSystemInfo(stat, {
          path: '.' + subdir + '/' + entry,
          fullPath,
          name: entry,
        });
        if (options.filter && !options.filter(fsEntry)) return
        if (fsEntry.isDirectory()) {
          directories.push(subdir + '/' + entry)
        }
        result.push(fsEntry)
      })
  }
  return result
}

function lsrAsyncBase(
  dir: string,
  options: Options,
  push: (entry: FileSystemEntry) => void,
  end: () => void,
  reject: (err: Error) => void,
  lazy: (fn: () => void) => void,
) {
  const directories = ['']
  function rec1(): void {
    if (directories.length === 0) return end()
    const subdir = <string>directories.shift()
    readdir(join(dir, subdir), function (err, entries) {
      if (err) return reject(err)
      entries.reverse()
      function rec2(): void {
        if (entries.length === 0) return rec1()
        const entry = <string>entries.pop()
        if (options.filterPath && !options.filterPath('.' + subdir + '/' + entry)) return rec2()
        stat(join(dir, subdir, entry), function (err, stat) {
          if (err && options.ignoreErrors) return rec2()
          if (err) return reject(err)
          const fsEntry = addFileSystemInfo(stat, {
            path: '.' + subdir + '/' + entry,
            fullPath: join(dir, subdir, entry),
            name: entry,
          });
          if (options.filter && !options.filter(fsEntry)) return rec2()
          if (stat.isDirectory()) {
            directories.push(subdir + '/' + entry)
          }
          push(fsEntry)
          lazy(rec2)
        })
      }
      lazy(rec2)
    })
  }
  rec1()
}

export type Callback = (err: Error | void | null, result: Array<FileSystemEntry>) => void;
export default lsrAsync;

export function lsrAsync(dir: string, options: Options, callback: Callback): void;
export function lsrAsync(dir: string, callback: Callback): void;
export function lsrAsync(dir: string, options?: Options): Promise<Array<FileSystemEntry>>;

export function lsrAsync(dir: string, options?: Options | Callback, callback?: Callback): Promise<Array<FileSystemEntry>> {
  if (typeof options === 'function') {
    callback = options
    options = undefined
  }
  const opts = <Options>(options || {});
  return new Promise(function (resolve, reject) {
    const result: Array<FileSystemEntry> = [];
    lsrAsyncBase(
      dir,
      opts,
      result.push.bind(result),
      resolve.bind(null, result),
      reject,
      function (fn) { fn(); },
    );
  }).nodeify(callback as any);
}

export function lsrStream(dir: string, options: Options): any {
  options = options || {};
  const result = new barrage.Readable({objectMode: true, highWaterMark: options.highWaterMark});
  let cont = true;
  let lazy: null | (() => void);
  lazy = function () {
    lsrAsyncBase(dir, options, function (entry) {
      cont = result.push(entry);
    }, function () {
      result.push(null);
    }, result.emit.bind(result, 'error'), function (fn) {
      if (cont) fn();
      else lazy = fn;
    });
  }
  result._read = function () {
    cont = true;
    if (lazy) {
      const fn = lazy;
      lazy = null;
      fn();
    }
  }
  return result;
}