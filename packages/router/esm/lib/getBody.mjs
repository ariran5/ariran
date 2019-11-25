export async function getBody(stream, headers = {}, maxSize = 1048576) {
  if (typeof headers === 'number') {
      maxSize = headers
      headers = {}
  }
  const contentLength = headers['content-length']

  if (contentLength && contentLength > maxSize) {
    throw new SizeError(`Превышен размер принемаемого файла: ${contentLength} > ${maxSize}`)
  }

  const body = []
  let length = 0

  const fn = chunk => {
    length += Buffer.byteLength(chunk)

    if (
      contentLength && length > contentLength
      ||
      length > maxSize
    ) {
      throw new SizeError(`Превышен размер принемаемого файла: ${length} > ${maxSize}`)
    }

    body.push(chunk)
  }

  stream.on('data', fn)

  return new Promise(res => {
    stream.on('end', () => {
      res(Buffer.concat(body))
    })
  })
  
}

class SizeError extends RangeError {
  get code(){
    return 'ELARGEFILE'
  }
}