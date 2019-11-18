import STR from 'stream'
import util from 'util'
const {
  finished: _finished,
  pipeline: _pipeline
} = STR

export default stream => {

  return new Proxy(stream, {
    get(obj, key, value) {

      console.assert(
        !(key in MethodsForStream && key in obj),
        'Добавленное свойство имеется в объекте stream: ',
        key
      )
      
      if (key in MethodsForStream) {
        const value = Reflect.get(MethodsForStream, key, value)
        return typeof value == 'function' ? value.bind(obj): value
      }

      if (key in stream) {
        const value = Reflect.get(obj, key, value)
        return typeof value == 'function' ? value.bind(obj): value
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