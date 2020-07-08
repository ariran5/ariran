import pkg from 'path-to-regexp'
import path from 'path'
import http2 from 'http2'
import cookie from 'cookie'
import { URLSearchParams } from 'url'


const extended = Symbol('extended')

const {
  join
} = path.posix;

const { pathToRegexp } = pkg;

const {
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_CONTENT_TYPE
} = http2.constants;

export default class Router {

  static methods = ['GET', 'POST', 'PUT', 'DELETE'];

  #pipelines = {
    GET: [],
    POST: [],
    PUT: [],
    DELETE: []
  };

  #globalPipeline = [];
  #basePath;
  #inititalStore = {};

  get pipline(){
    return this.#globalPipeline
  }

  get store(){
    return this.#inititalStore
  }

  set basePath(value){
    this.#basePath = value
  }

  get basePath(){
    return this.#basePath
  }

  constructor({
    basePath = '/',
  } = {}){
    this.#basePath = basePath

  }

  get(){
    this.setRoute('GET', ...arguments)
  }
  post(){
    this.setRoute('POST', ...arguments)
  }
  put(){
    this.setRoute('PUT', ...arguments)
  }
  delete(){
    this.setRoute('DELETE', ...arguments)
  }

  use() {
    const lastArg = arguments[arguments.length - 1]
    const preLastArg = arguments[arguments.length - 2] ?? null

    if (lastArg instanceof Router) {
      this.useWithRouter(preLastArg, lastArg)
    } else {
      this.setRoute(null, preLastArg, lastArg)
    }

  }

  useWithRouter(path, routerObject){
    this.#globalPipeline.push(routerObject)

      Router.methods.forEach(item => {
        this.#pipelines[item].push(routerObject)
      })

      routerObject.basePath = join(this.#basePath, path || '(.*)')
  }

  setRoute(method, path, callback){

    if (path instanceof Function) {
      callback = path
      path = null
    }
    
    const route = {
      method,
      path: null,
      regex: null,
      callback,
    }

    if (!path) {
      route.path = join(this.#basePath, '(.*)')
    } else {
      route.path = join(this.#basePath, path)
    }
    
    route.regex = pathToRegexp(route.path)

    this.#globalPipeline.push(route)

    if (!method) {
      Router.methods.forEach(item => {
        this.#pipelines[item].push(route)
      })
    } else {
      this.#pipelines[method].push(route)
    }
  }

  async run(stream, headers, flags, store = {}){
    const method = headers[HTTP2_HEADER_METHOD]
    const path = headers[HTTP2_HEADER_PATH]

    if (!store.searchParams) {
      const search = path.match(/\?.+/i)[0]
      store.query = new URLSearchParams(search)
    }

    if (!Router.methods.includes(method)) {
      stream.respond({
        [HTTP2_HEADER_STATUS]: 405,
      }, {
        endStream: true,
      })
      return
    }

    if (!stream[extended]) {
      const end = stream.end.bind(stream)
      Object.assign(stream, {
        get [extended](){
          return true
        },
  
        end() {
          if (!arguments[arguments.length - 1] instanceof Function) {  
            return end(...arguments)
          }

          return new Promise((res, rej) => {
            end(...arguments, err => {
              if (err) {
                rej(err)
                return
              }
              res()
            })
          })
        }
      })
    }

    
    Object.assign(store, this.#inititalStore)

    const pipelinesForThisMethod = this.#pipelines[method]

    for (let i = 0; i < pipelinesForThisMethod.length; i++) {
      if (stream.destroyed || stream.closed || !stream.writable) {
        break
      }

      const item = pipelinesForThisMethod[i]

      if (item instanceof Router) {
        await item.run(stream, headers, flags, store)
      } else if (item.regex.test(path)) {
        const result = item.callback(stream, headers, store, flags)
        if (result instanceof Promise) {
          await result
        }
      }
    } 
  }
}

const extendsMethods = {
  parseCookie(str){
    return cookie.parse(srt)
  },
  toCookie(key, value, options){

    return {
      toString(){
        return 
      }

    }

  },
  enableSearchParams(bool){

  },
  getBody(){

  },
  end(){

  }
}


// function autoclear(options){
//   const obj = {}
//   const cache = {}
//   //const count = 

//   return new Proxy({}, {
//     set(obj, key, value, receiver){
//       clearTimeout(cache[key])
//       Reflect.set(obj, key, value, receiver)

//       cache[key] = setTimeout(() => {
//         Reflect.deleteProperty(obj, key)
//         Reflect.deleteProperty(cache, key)
//       }, 5000)
//     }
//   })
// }