import Events from '@arian/events'
import FilesStore from '@arian/files-store'

const uploadList = Symbol('uploadList')


export default class UploadProgress extends Events {
  constructor(store, options = {}){
    super()

    if (!store) {
      throw new Error('Нет файлового хранилища. Оно должно быть экземпляром класса FilesStore')
    }

    if ( !(store instanceof FilesStore) ) {
      throw new Error('Каталог файлов не наследуется от класса FilesStore')
    }

    Object.assign(this, options)

    this.store = store
    this[uploadList] = new Map()

    store.on('add', ({changes}) => {

      for (let file of changes) {
        this.createUploadStream(file)
      }

    })

    store.on('delete', ({changes}) => {

      for (let file of changes) {
        this.abort(file)
      }

    })

    store.on('change', () => {
      this.emit('change',{
        uploads: this.uploads
      })
    })
  }

  get uploads(){
    return Array.from(this[uploadList])
  }

  get(file){
    return this[uploadList].get(file)
  }

  get stat(){
    // TODO: сделать кэширование статистики на 50 мс

    return this.uploads
      .reduce((reducer, [file, {total, loaded, timeToEnd, done}]) => {
        reducer.loaded += loaded
        reducer.total += total

        if (timeToEnd > reducer.timeToEnd) {
          reducer.timeToEnd = timeToEnd
        }

        if (!done)
          reducer.done = false

        return reducer
      }, {total: 0, loaded: 0, timeToEnd: 0, done: true})
  }

  set stat(value) {
    console.warn('Невозможно присвоить свойство, это геттер')
  }

  createUploadStream(file){
    const xhr = new XMLHttpRequest()
    const startTime = Date.now()

    const data = {
      file,
      xhr,
      loaded: 0,
      total: file.size,
      timeToEnd: 0,
      done: false,
    }

    xhr.upload.addEventListener('progress', ({loaded, total}) => {
      data.loaded = loaded

      {
        const time = Date.now() - startTime
        data.timeToEnd = (time/(loaded/data.total) - time)/1000 | 0
      }
      this.emit('progress', data)
    })

    const onError = (error) => {
      const data = this[uploadList].get(file)
      this.emit('error', {file, data, error})
      this.store.delete(file)
    }

    xhr.addEventListener('error', onError)
    xhr.addEventListener('abort', onError)
    xhr.addEventListener('timeout', onError)

    xhr.addEventListener('load', event => {
      data.loaded = data.total
      data.done = true
      this.emit('progress', data)
    })

    xhr.open('POST', this.url)

    xhr.send(file)

    this[uploadList].set(file, data)

    return data
  }

  abort(file) {
    this[uploadList].get(file).xhr.abort()
    this[uploadList].delete(file)
  }

}
