const STR = require('stream')
const util = require('util')

const {
  finished: _finished,
  pipeline: _pipeline
} = STR

module.exports = stream => {
  if ('store' in stream) {
    return stream
  }

  return new Proxy(stream, {
    get(obj, key, value) {

      console.assert(
        !(key in MethodsForStream && key in obj),
        'Добавленное свойство имеется в объекте stream: ',
        key
      )
      
      if (key in MethodsForStream) {
        const result = Reflect.get(MethodsForStream, key, value)
        return typeof result == 'function' ? result.bind(obj): result
      }

      if (key in stream) {
        const result = Reflect.get(obj, key, value)
        return typeof result == 'function' ? result.bind(obj): result
      }

    }
  })
}

const finished = util.promisify(_finished)
const pipeline = util.promisify(_pipeline)

const kdata = Symbol('data')

const MethodsForStream = {
  get store() {
    if (!this[kdata]) {
      this[kdata] = {}
    }
    return this[kdata]
  },
  get finished() {
    return finished(this)
  },
  pipeline() {
    return pipeline(this, ...arguments)
  },
}