import http1ToHttp2 from './http1ToHttp2.mjs';
import http2 from 'http2';
import nodePath from 'path'
import url from 'url'

// TODO: сделать нейронку сервер пуша, что бы она обучалась отдавать файлы для страниц

const {
    HTTP2_HEADER_PATH,
    HTTP2_HEADER_METHOD,
    HTTP_STATUS_NOT_FOUND,
    HTTP_STATUS_INTERNAL_SERVER_ERROR
  } = http2.constants;

const windowsSlashRegex = /\\/g

function parseArgs(path, callback, ...args){

  if ( path instanceof Function ) {
    path = null;
    [callback, ...args] = arguments;
  }

  if (path)
    path = nodePath.join(this.basePath, path)

  if (windowsSlashRegex.test(path))
    path = path.replace(windowsSlashRegex, '/')
  return {
    path,
    callback,
    args
  }
}

const _host = Symbol('host')

class Router {
  constructor( options = {}){
    this.restFunctions = [];

    this.basePath = options.basePath || '/'
  }

  http2 (stream, headers) {

    // если передается 1 аргумент то это кто-то передал руками опции
    if (arguments.length == 1) {
      this.parseOptions(stream);
    } else {
      return this.request(stream, headers);
    }
  }

  http1 (request, response) {

    if ( parseInt(request.httpVersion) >= 2 ) return;

    // если передается 1 аргумент то это кто-то передал руками опции
    if (arguments.length == 1) {
      this.parseOptions(request);
    } else {
      const {stream, headers} = http1ToHttp2(request, response);
      return this.request(stream, headers);
    }
  }

  set host(value){
    this[_host] = value
  }

  get host(){
    return this[_host]
  }

  async request (stream, headers) {

    if (this[_host] && headers.host !== this[_host]) {
      return false
    }

    const reqPath = headers[HTTP2_HEADER_PATH];
    const reqMethod = headers[HTTP2_HEADER_METHOD];

    for (var i = 0; i < this.restFunctions.length; i++) {
      if ( stream.writable ) {
        let Callback;
        if (this.restFunctions[i] instanceof Function) {
          Callback = this.restFunctions[i](...arguments)
        } else {
          Callback = runRoute( this.restFunctions[i] );
        }

        if ( Callback instanceof Promise) {
          await Callback.catch(console.error);
        }
      }


    }

    function runRoute({path, callback, args, method}) {

      if ( method != reqMethod && method != "USE") {
        return;
      }

      if (typeof path === 'string') {
        var checkPathResult = checkPath(path, reqPath)
      }

      if (
        !path ||
         checkPathResult ||
         path instanceof RegExp && path.test(reqPath)) {

        const Callback =
         callback(stream, headers, ...args, checkPathResult);
         return Callback;

      }

      function checkPath(parsePath, parseReqPath) {

        const regex = /:?[^/]+/gim
        const [reqPath, query] = parseReqPath.split('?')

        const matchedPath = (parsePath.split('?')[0]).match(regex) || []
        const matchedReqPath = reqPath.match(regex) || []

        if (matchedPath.length !== matchedReqPath.length) {
          return false
        }

        const use = matchedPath.every((item, index) => {
          if (matchedReqPath[index] === item) {
            return true
          } else if ( /:/.test(item) ) {
            return true
          } else {
            return false
          }
        })

        if (!use) return false

        const options = {
          params: {},
          query: {}
        }
        matchedPath.reduce((reducer, item, index) => {
          if (/:/.test(item)) {
            const key = item.slice(1)
            reducer.params[key] = matchedReqPath[index]
          }
          return reducer
        }, options)

        query && query
          .split('&')
          .reduce((reducer, item, index) => {
            if (/=/.test(item)) {
              const [key, value] = item.split('=')
              reducer.query[key] = value
            } else {
              reducer.query[item] = true
            }
            return reducer
          }, options)
        return options
      }

    }
  }

  get () {
    if ( !arguments.length ) {
      throw new Error('Пустой роут');
    }
    const {path, callback, args} = parseArgs.call(this, ...arguments)

    this.restFunctions.push({
      method: "GET",
      path,
      callback,
      args
    })

    return this;
  }

  post () {
    if ( !arguments.length ) {
      throw new Error('Пустой роут');
    }
    const {path, callback, args} = parseArgs.call(this, ...arguments)

    this.restFunctions.push({
      method: "POST",
      path,
      callback,
      args
    })

    return this;
  }

  delete () {
    if ( !arguments.length ) {
      throw new Error('Пустой роут');
    }
    const {path, callback, args} = parseArgs.call(this, ...arguments)

    this.restFunctions.push({
      method: "DELETE",
      path,
      callback,
      args
    })

    return this;
  }

  put () {
    if ( !arguments.length ) {
      throw new Error('Пустой роут');
    }
    const {path, callback, args} = parseArgs.call(this, ...arguments)

    this.restFunctions.push({
      method: "PUT",
      path,
      callback,
      args
    })

    return this;
  }

  use () {
    if ( !arguments.length ) {
      throw new Error('Пустой роут');
    }
    const {path, callback, args} = parseArgs.call(this, ...arguments)

    if (path && arguments.length == 1) {
      // вложенные вызовы через use

      const newRouter = new Router({
        basePath: path
      })
      this.restFunctions.push(newRouter.request.bind(newRouter))
      return newRouter
    } else {

      this.restFunctions.push({
        method: "USE",
        path,
        callback,
        args
      })
      return this;
    }
  }

}
export default Router
export const router = new Router();
export const http2Request = router.http2.bind(router);
export const http1Request = router.http1.bind(router);
