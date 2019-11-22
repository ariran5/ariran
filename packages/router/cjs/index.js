const http2 = require('http2')
const nodePath = require('path')

const extendsStream = require('./lib/extendsStream.js')

// TODO: сделать нейронку сервер пуша, что бы она обучалась отдавать файлы для страниц

const {
    HTTP2_HEADER_PATH,
    HTTP2_HEADER_METHOD,
    HTTP_STATUS_NOT_FOUND,
    HTTP_STATUS_INTERNAL_SERVER_ERROR
  } = http2.constants;

const windowsSlashRegex = /\\/g

const _host = Symbol('host')

class Router {
  restFunctions = []

  constructor( options = {}){
    this.basePath = options.basePath || '/'

    if (options.restFunctions)
      this.restFunctions = options.restFunctions
  }

  parseArgs = (...fnArgs) => {
    let [path, callback, ...args] = fnArgs

    if ( path instanceof Function ) {
      path = '/*';
      [callback, ...args] = fnArgs
    }
    if (typeof path === 'string') {
      path = nodePath.join(this.basePath, path)

      if (~path.indexOf('*')) {
        if (path[path.length - 1] !== '*') {
          path = path.replace('/*', '')
        }
      }
      
      if (windowsSlashRegex.test(path))
        path = path.replace(windowsSlashRegex, '/')
    }
  
    return {
      path,
      callback,
      args
    }
  }
  

  // http2 (stream, headers) {

  //   // если передается 1 аргумент то это кто-то передал руками опции
  //   if (arguments.length == 1) {
  //     this.parseOptions(stream);
  //   } else {
  //     return this.request(stream, headers);
  //   }
  // }

  // http1 (request, response) {

  //   // if ( parseInt(request.httpVersion) >= 2 ) return;

  //   // // если передается 1 аргумент то это кто-то передал руками опции
  //   // if (arguments.length == 1) {
  //   //   this.parseOptions(request);
  //   // } else {
  //   //   const {stream, headers} = http1ToHttp2(request, response);
  //   //   return this.request(stream, headers);
  //   // }
  // }

  set host(value){
    this[_host] = value
  }

  get host(){
    return this[_host]
  }

  request = async (...args) => {
    let [stream, headers, ...arr] = args
    stream = extendsStream(stream)

    const newArgs = [stream, headers, ...arr]

    if (this[_host] && headers.host !== this[_host]) {
      return false
    }

    for (const route of this.restFunctions) {
      if ( !stream.writable ) {
        return false
      }

      try {
        const Callback = this.runRoute( newArgs, route );

        if (Callback instanceof Promise)
          await Callback

      } catch (err) {
        console.error(err);
      }
    }
  }

  get () {
    if ( !arguments.length ) {
      throw new Error('Пустой роут');
    }
    const { path, callback, args } = this.parseArgs(...arguments)

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
    const {path, callback, args} = this.parseArgs(...arguments)

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
    const {path, callback, args} = this.parseArgs(...arguments)

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
    const {path, callback, args} = this.parseArgs(...arguments)

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
    const {path, callback, args} = this.parseArgs(...arguments)    

    if (path && !callback) {
      // вложенные вызовы через use

      const newRouter = new Router({
        basePath: path,
        restFunctions: this.restFunctions
      })
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

  parseCookie = (stream, cookiesString = '') => {
    if (!cookiesString) {
      return {}
    }

    const cookies =  Object.fromEntries(
      cookiesString.split(/; */).map(cookie => {
        return cookie.split('=')
      })
    )

    return new Proxy(cookies, {
      set(obj, key, value) {
        
        // console.log(stream.endAfterHeaders);
        
        // if (stream.endAfterHeaders) {
        //   return false
        // }
        
        Reflect.set(obj, key, value)
        stream.additionalHeaders({
          'set-cookie': `${key}=${value}`
        })

        return true
      }
    })
  }

  parsePath = (routePath, reqPathWithQuery) => {
    const [reqPath, query = ''] = reqPathWithQuery.split('?')
    let params

    // Если регулярка и путь не прошел ее
    if (routePath instanceof RegExp) {
      params = reqPath.match(routePath)
      
      if (!params) {
        return false
      }

    } else {
      // поиск слов между слешами
      const regex = /:?[^/]+/gim

      const matchedPath = routePath.split('?')[0].match(regex) || []
      const matchedReqPath = reqPath.match(regex) || []

      for (let i = 0; i < (matchedPath.length || 1); i++) {
        const item = matchedPath[i]
        if (item === '*')
          break

        if (i === matchedPath.length - 1 && matchedPath.length !== matchedReqPath.length)
          return false

        if (/:/.test(item))
          continue

        if (matchedReqPath[i] !== item)
          return false
      }


      params = this.parseParams(matchedPath, matchedReqPath)
    }

    return {
      params,
      query: this.parseQuery(query)
    }
  }

  runRoute = (reqArgs, {path, method, callback, args}) => {

    const [stream, headers] = reqArgs

    const reqPath = headers[HTTP2_HEADER_PATH]
    const reqMethod = headers[HTTP2_HEADER_METHOD]

    if ( method !== reqMethod && method !== "USE") {
      return;
    }

    const parsedPath = this.parsePath(path, reqPath)

    if (parsedPath) {
      
      Object.assign(
        stream.store,
        parsedPath,
        {
          cookie: this.parseCookie(stream, headers['cookie'])
        }
      )

      const Callback = callback(stream, headers, ...args);
       return Callback;

    }

  }

  parseParams = (matchedPath, matchedReqPath) => Object.fromEntries(
    matchedPath
      .map((item, index) => [item, matchedReqPath[index]])
      .filter(([item]) => /:/.test(item))
      .map(item => {
        item[0] = item[0].slice(1)
        return item
      })
  )

  parseQuery = queryString => queryString
    .split('&')
    .map(item => item.split('='))
    .filter(([key]) => key)
    .reduce((acc, [key, value = true]) => {
      acc[key] = value
      return acc
    }, {})

}
module.exports = {
  default: Router,
  router: new Router()
}
