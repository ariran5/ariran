import Events from '@arian/events'
import FilesStore from '@arian/files-store'

const functions = Symbol('functions')

export default class DragNDrop extends Events {
  constructor(element, options = {}){
    super();

    Object.assign(this, {
      filters: {
        name: {},
        size: {},
        types: []
      }
    }, options)

    if (this.store instanceof FilesStore) {
      this
        .on('files', ({files}) => {
          this.store.concat(files)
        })
    }

    this.el = this.getEl(element)


    this[functions]()

    this.setListeners()
  }

  [functions](){

    const OnDragEnter = event => {
      this.emit('enter', { event })
    }

    const OnDragOver = event => {
      event.preventDefault()
    }

    const OnDragLeave = event => {
      this.emit('leave', { event })
    }

    const OnDrop = event => {
      event.preventDefault()
      this.emit('drop', { event })

      let {
        dataTransfer: {
          files
        }
      } = event

      this.emit('files', { event, files })

    }

    Object.assign(this, {
      OnDragEnter,
      OnDragOver,
      OnDragLeave,
      OnDrop,
    })
  }

  setListeners(){
    const {
      el,
      OnDragEnter,
      OnDragOver,
      OnDragLeave,
      OnDrop,
    } = this

    if (!(
      OnDragEnter &&
      OnDragOver &&
      OnDragLeave &&
      OnDrop )) {
      console.error("Нет функции для обработчика")
    }

    el.addEventListener('dragenter', this.OnDragEnter)
    el.addEventListener('dragover', this.OnDragOver)
    el.addEventListener('dragleave', this.OnDragLeave)
    el.addEventListener('drop', this.OnDrop)
  }

  __filters(files){
    const arr = Array.from(files)

    let filtered = arr

    const {name, types, size} = this.filters


    {
      const {max, min} = size

      if (max)
        filtered = filtered.filter( ({size}) => {
          return size <= max
        })
      // var notValid = newArray.filter(item => item.size > this.filters.maxFileSize)

      if (min)
        filtered = filtered.filter( ({size}) => {
          return size >= min
        })
    }

    {
      if (types.length)
        filtered = filtered.filter( ({type}) => {
          return types.includes(type)
        })
    }

    {
      const {minLength, maxLength} = name

      if (minLength)
        filtered = filtered.filter(item => {
          return item.name.length <= this.filters.name.maxLength
        })

      if (maxLength)
        filtered = filtered.filter(item => {
          return item.name.length <= this.filters.name.maxLength
        })
    }

    return {filtered, notValid: arr.filter(item => !filtered.includes(item))}
  }

  getEl(element){
    let el

    if (element instanceof Object) {
      el = element
    } else if (typeof element == 'string') {
      el = document.querySelector(element)
    } else {
      throw new Error('Нету такого элемента', element)
    }

    return el
  }

  destroy(){

    el.removeEventListener('dragenter', this.OnDragEnter)
    el.removeEventListener('dragover', this.OnDragOver)
    el.removeEventListener('dragleave', this.OnDragLeave)
    el.removeEventListener('drop', this.OnDrop)
  }
}
