const [
  nodeMajorStr,
  nodeMinorStr
] = process.versions.node.split('.');

const nodeMajor = parseInt(nodeMajorStr);
const nodeMinor = parseInt(nodeMinorStr);

if (nodeMajor > 16 || (nodeMajor === 16 && nodeMinor >= 5)) {
  const undici = require("undici");

  const fetch = function (requestOrUrl, options) {
    if (typeof requestOrUrl === "string") {
      return fetch(new Request(requestOrUrl, options));
    }
    Object.defineProperty(requestOrUrl, 'headers', {
      value: requestOrUrl.headers || new undici.Headers({})
    });
    requestOrUrl.headers.delete("connection");
    return undici.fetch(requestOrUrl);
  };

  function Request(requestOrUrl, options) {
    if (typeof requestOrUrl === "string") {
      options = options || {};
      options.headers = options.headers || {};
      delete options.headers.connection;
      delete options.headers.Connection;
      return new undici.Request(requestOrUrl, options);
    }
    const newRequestObj = requestOrUrl.clone();
    newRequestObj.headers = newRequestObj.headers || new undici.Headers({});
    newRequestObj.headers.delete("connection");
    return newRequestObj;
  }

  fetch.ponyfill = true;

  module.exports = exports = fetch;
  exports.fetch = fetch;
  exports.Headers = undici.Headers;
  exports.Request = Request;
  exports.Response = undici.Response;
  exports.FormData = undici.FormData;
  exports.AbortController = globalThis.AbortController;

  const streamsWeb = require("stream/web");
  const streams = require("stream");

  exports.ReadableStream = streamsWeb.ReadableStream;
  exports.ReadableStream.prototype.pipe = function pipe(...args) {
    if (!this._readable) {
      this._readable = streams.Readable.from(this);
    }
    return this._readable.pipe(...args);
  }

  exports.ReadableStream.prototype.on = function on(...args) {
    if (!this._readable) {
      this._readable = streams.Readable.from(this);
    }
    return this._readable.on(...args);
  }

  exports.ReadableStream.prototype.removeListener = function on(...args) {
    if (!this._readable) {
      this._readable = streams.Readable.from(this);
    }
    return this._readable.removeListener(...args);
  }

  undici.File.prototype.createReadStream = function createReadStream() {
    return streams.Readable.from(this.stream());
  }

  undici.File.prototype.then = function createReadStream() {
    return this;
  }
  
  Object.defineProperties(undici.File.prototype, {
    filename: {
      get: () => this.name,
    },
    mimetype: {
      get: () => this.type,
    },
  })

  const addFormDataToRequest = require('./add-formdata-to-request');
  addFormDataToRequest(undici.Request, undici.File, undici.FormData);

  // Needed for TypeScript consumers without esModuleInterop.
  exports.default = fetch;
} else {
  const nodeFetch = require("node-fetch");
  const realFetch = nodeFetch.default || nodeFetch;

  const fetch = function (requestOrUrl, options) {
    if (typeof requestOrUrl === "string") {
      // Support schemaless URIs on the server for parity with the browser.
      // Ex: //github.com/ -> https://github.com/
      if (/^\/\//.test(requestOrUrl)) {
        requestOrUrl = "https:" + requestOrUrl;
      }
      return fetch(new nodeFetch.Request(requestOrUrl, options));
    }
    requestOrUrl.headers.set("Connection", "keep-alive");
    return realFetch(requestOrUrl);
  };

  fetch.ponyfill = true;

  module.exports = exports = fetch;
  exports.fetch = fetch;
  exports.Headers = nodeFetch.Headers;
  const formDataEncoderModule = require("form-data-encoder");
  const streams = require("stream");
  exports.Request = function(info, init) {
    if (info instanceof nodeFetch.Request) {
      return info.clone();
    }
    if (init && init.body && init.body instanceof formDataModule.FormData){
      init.headers = new nodeFetch.Headers(init.headers || {});
      const encoder = new formDataEncoderModule.FormDataEncoder(init.body)
      for (const headerKey in encoder.headers) {
        init.headers.set(headerKey, encoder.headers[headerKey])
      }
      init.body = streams.Readable.from(encoder.encode());
    }
    return new nodeFetch.Request(info, init);
  };
  exports.Response = nodeFetch.Response;

  const abortControllerModule = require("abort-controller");
  exports.AbortController =
    abortControllerModule.default || abortControllerModule;

  const formDataModule = require("formdata-node");
  exports.FormData = formDataModule.FormData

  const readableStreamModule = require("./readable-stream");
  exports.ReadableStream = readableStreamModule.default || readableStreamModule;

  // Needed for TypeScript consumers without esModuleInterop.
  exports.default = fetch;

  const addFormDataToRequest = require('./add-formdata-to-request');
  addFormDataToRequest(nodeFetch.Request, formDataModule.File, exports.FormData);
}