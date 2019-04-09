import Events from '@ariran/events'

const filesSymbol = Symbol('files')
const hasFile = Symbol('hasFile')

export default class FilesList extends Events {
  constructor(files, options){
    super()

    if (files.toString = '[object Object]') {
      options = files
      files = null
    }

    Object.assign(this, options)
    // {
    //   filters: {
    //     size: {
    //       min: null,
    //       max: null
    //     },
    //     maxFilesCount: null,
    //     maxFileSize: null
    //   }
    // }

    this[filesSymbol] = new Set()

    if (files) {
      this.concat(this.toSet(files))
    }
  }

  add(file){

    if (!(file instanceof File)) {
      throw new Error('Добавляемый объект должен быть файлом')
    }
    const set = new Set([file])

    if (this[hasFile](file)) {
      return this.emit('duplicate', {duplicates: set, files: this.files})
    }

    const {changes} = this.__filters(set)

    if (changes.size === 0) {
      return
    }

    this[filesSymbol].add(file)

    this.emit('add', { changes: set, files: this.files })
    this.emit('change', { type: 'add', changes: set, files: this.files })
  }

  has(file){
    return this[filesSymbol].has(file)
  }

  [hasFile](file){
    if (!file) {
      throw new Error('Не передан файл в функцию')
    }
    const {name: fname, size: fsize} = file

    return this.files.some(({name, size}) => {
      return name + size === fname + fsize
    })
  }

  __filters(changes){
    const rejected = new Set()

    if (!this.filters) return {changes, rejected}


    const { size, maxFilesSize, maxFilesCount } = this.filters

    const files = this.files

    if (maxFilesCount){

      if (maxFilesCount <= files.length + changes.size) {
        for (let file of changes) {
          rejected.add(file)
        }
        changes.clear()
        this.emit('reject', {type: 'maxFilesCount', rejected, files: this.files})
      }
      // this.emit('reject', {type: 'maxFilesCount', rejected: set, files})
    } else if (maxFilesSize) {

      const totalSize = files.reduce((reducer, {size}) => reducer += size, 0)
      const totalChangesSize = Array.from(changes)
        .reduce((reducer, {size}) => reducer += size, 0)

      if (totalSize + totalChangesSize > maxFilesSize) {
        for (let file of changes) {
          rejected.add(file)
        }
        changes.clear()
        this.emit('reject', {type: 'maxFilesSize', rejected, files: this.files})
      }

    }

    if (!changes.size) {
      return {changes, rejected}
    }

    {
      const {name, types, size} = this.filters

      const toReject = file => {
        rejected.add(file)
        changes.delete(file)
      }

      for (let change of changes) {
        if (size) {
          const {max, min} = size

          if (min && change.size < min) {
            toReject(change)
            this.emit('reject', {type: 'minFileSize', rejected: new Set([change]), files: this.files})
            continue;
          } else if (max && change.size > max) {
            toReject(change)
            this.emit('reject', {type: 'maxFileSize', rejected: new Set([change]), files: this.files})
            continue;
          }
        }

        if (name) {
          const {minLength, maxLength} = name

          if (minLength && change.name.length < minLength) {
            toReject(change)
            this.emit('reject', {type: 'minFileNameLength', rejected: new Set([change]), files: this.files})
            continue;
          } else if (maxLength && change.name.length > maxLength) {
            toReject(change)
            this.emit('reject', {type: 'maxFileNameLength', rejected: new Set([change]), files: this.files})
            continue;
          }
        }

        if (types && types.length && !types.includes(type)) {
          toReject(change)
          this.emit('reject', {type: 'mimeType', rejected: new Set([change]), files: this.files})
          continue;
        }
      }
    }

    return {changes, rejected}
  }

  delete(file){
    const set = new Set([file])

    this[filesSymbol].delete(file)
    this.emit('delete', { changes: set, files: this.files })
    this.emit('change', { type: 'delete', changes: set, files: this.files })
  }

  clear(){
    const oldFiles = new Set(Array.from(this[filesSymbol]))
    this[filesSymbol].clear()
    this.emit('delete', { changes: oldFiles ,files: this.files })
    this.emit('change', { type: 'delete', changes: oldFiles ,files: this.files })
  }

  concat(newFiles){
    const newFilesSet = this.toSet(newFiles)

    const duplicates = new Set()
    const notDuplicates = new Set()
    for (let file of newFilesSet) {
      if (this[hasFile](file)) {
        duplicates.add(file)
      } else {
        notDuplicates.add(file)
      }
    }

    if (duplicates.size) {
      this.emit('duplicate', {duplicates, files: this.files})
    }

    if (notDuplicates.size === 0) {
      return
    }

    const { changes } = this.__filters(notDuplicates)

    if (changes.size === 0) {
      return
    }

    for (let file of changes) {
      this[filesSymbol].add(file)
    }

    this.emit('add', { changes, files: this.files })
    this.emit('change', { type: 'add', changes, files: this.files })
  }

  toString(){
    return Array.from(this[filesSymbol]).map(item => item.name).toString()
  }

  get files(){
    return Array.from(this[filesSymbol])
  }

  set files(newFiles){
    const newFilesSet = this.toSet(newFiles)
    this.clear()
    this.concat(newFilesSet)
  }

  get size(){
    return this[filesSymbol].size
  }

  toSet(data){
    let result

    if (data instanceof Array || data instanceof FileList) {
      result = new Set(data)
    } else if (data instanceof Set) {
      result = data
    } else {
      throw new Error('Файлы должны быть массивом или сетом')
    }
    return result
  }
}
