"use strict";

const httpx = require("httpx");
const qs = require("querystring");
const debug = require("debug");
/**
 * headers key to lower case
 */
function headersKeyLowerify(headers) {
  let newHeaders = {};
  let keys = Object.keys(headers);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    newHeaders[key.toLocaleLowerCase()] = headers[key];
  }
  return newHeaders;
}
/**
 * base http request class
 */
class Http {
  constructor(
    config = {
      endpoint: "https://openapi.wul.ai"
    }
  ) {
    this.endpoint = config.endpoint;
    const HttpModule = this.endpoint.startsWith("https://")
      ? require("https")
      : require("http");
    // open connection pool
    this.keepAliveAgent = new HttpModule.Agent({
      keepAlive: true,
      keepAliveMsecs: 3000
    });
  }
  /**
   * default headers
   *
   * @readonly
   * @memberof Http
   */
  get defaultHeaders() {
    const nowDate = new Date();
    const headers = {
      accept: "application/json",
      date: nowDate.toGMTString()
    };
    return headers;
  }
  get(url, query, headers, options) {
    return this.request("GET", url, query, "", headers, options);
  }
  post(url, query, body, headers, options) {
    return this.request("POST", url, query, body, headers, options);
  }
  put(url, query, body, headers, options) {
    return this.request("PUT", url, query, body, headers, options);
  }
  delete(url, query, headers, options) {
    return this.request("DELETE", url, query, "", headers, options);
  }
  request(method, url, query = {}, body = "", headers = {}, options) {
    let sendBody = null;
    // deal request url
    let reqUrl = `${this.endpoint}${url}`;
    // deal headers
    const mixHeaders = Object.assign(
      this.defaultHeaders,
      headersKeyLowerify(headers)
    );
    // deal query
    if (Object.keys(query).length) {
      reqUrl += `?${qs.stringify(query)}`;
    }
    // deal body
    if (body) {
      sendBody = Buffer.from(body, "utf8");
    }
    debug(`wulai sdk: request => ${reqUrl}`);
    // deal options
    const reqOptions = Object.assign(
      {
        method,
        agent: this.keepAliveAgent,
        headers: mixHeaders,
        data: sendBody
      },
      options
    );
    // send request
    return httpx.request(reqUrl, reqOptions).then(res => {
      return httpx.read(res, "utf8").then(body => {
        let resJson = null;
        const status = res.statusCode;
        try {
          resJson = JSON.parse(body);
        } catch (error) {
          error.name = "JSON Format Error.";
          error.message = "parse response to json error.";
          error.body = body;
          throw error;
        }
        if (status >= 400) {
          const errCode = resJson.code;
          const errMsg = resJson.message;
          const err = new Error(`code: ${errCode}, ${errMsg}`);
          err.name = `${errCode} Error`;
          err.status = status;
          err.result = resJson;
          err.code = errCode;
          throw err;
        }
        return resJson;
      });
    });
  }
}

module.exports = Http;