const fs = require('fs')

// todo stream to req,res + proxy

module.exports = function(request, response) {
  const stream = response;
  const headers = Object.assign({}, request.headers);
  headers[":path"] = request.url;
  headers[":method"] = request.method;
  headers[":authority"] = request.headers.host;
  // у нас всегда редирект на https
  headers[":scheme"] = 'https';

  if ( !('respond' in stream) ) {
    Object.defineProperty(stream.__proto__, 'respond', {
      value: respond,
      enumerable: false,
      configurable: true,
      writable: true,
    })
  }
  if ( !('respondWithFD' in stream) ) {
    Object.defineProperty(stream.__proto__, 'respondWithFD', {
      value: respondWithFD,
      enumerable: false,
      configurable: true,
      writable: true,
    })
  }
  if ( !('respondWithFile' in stream) ) {
    Object.defineProperty(stream.__proto__, 'respondWithFile', {
      value: respondWithFile,
      enumerable: false,
      configurable: true,
      writable: true,
    })
  }

  stream.closed = false;
  request.on('data', (...args) => {
    response.emit('data',...args)
  })

  request.on('end', (...args) => {
    response.emit('end',...args)
  })


  stream.aborted = false;
  request.on('abort', () => {
    stream.aborted = true
    stream.emit('abort')
  })

  request.on( 'close', event => {
    stream.end()
  });
  request.on( 'error', event => {
    stream.end()
  });

  return [
    stream,
    headers
  ]
}
function respond(headers, options = {}) {
  setHeaders.call(this, headers);

  const {
    endStream
  } = options

  endStream && this.end()
}

function respondWithFD(url, headers, options = {}) {
  throw new Error('Не работает в http1');
  // fs.open(url,'r',(err, fd) => {})
}

function respondWithFile(url, headers, options = {}) {

  if (!url) {
    throw new Error('Не передан путь');
  }

  new Promise( ( resolve, reject ) => {

    fs.stat(url, (err, stat) => {
      if (err) reject(err);
      resolve(stat)
    })

  })
    .then( stat => {
      if ( !stat.isFile() ) return Promise.reject('is directory');

      options.checkStat && options.checkStat(stat)

      setHeaders.call(this, headers);
      const readStream = fs.createReadStream(url);
      readStream.pipe(this);
      readStream.on('error', (err) => {
        reject(err);
      });

    })
    .catch( err => {
      options.onError && options.onError(err, this);
    });
}

function setHeaders(headers = {}) {

  if ( headers[':status'] ) {
    const status = headers[':status'];
    delete headers[':status'];
    this.writeHead(status, headers);
  } else {
    for (var header in headers) {
      this.setHeader(header, headers[header]);
    }
  }

}
