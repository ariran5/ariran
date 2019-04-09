export const listeners = Symbol('listeners')
export const clearListeners = Symbol('clearListeners')

const nameToArray = Symbol('nameToArray')

export default class Events {
  constructor(){
    this[listeners] = new Map()
  }
  on(name, fn){

    this[nameToArray](name).forEach(name => {
      if ( !this[listeners].get(name) ){
        this[listeners].set(name, (new Set()))
      }
      const set = this[listeners].get(name)

      set.add(fn)
    })

    return this
  }

  off(name, fn){
    this[nameToArray](name).forEach(name => {
      const set = this[listeners].get(name)

      if (!set) return

      set.delete(fn)
    })

    return this
  }

  emit(name, ...args){
    this[nameToArray](name).forEach(name => {
      const set = this[listeners].get(name)

      if (!set) return false

      try {
        for (let fn of set) {
          fn.call(this, ...args)
        }
      } catch (e) {
        console.error(e)
      }
    })

    return true
  }
  [clearListeners](){
    this[listeners] = null
  }

  [nameToArray](name){
    return name.split(' ')
  }
}
