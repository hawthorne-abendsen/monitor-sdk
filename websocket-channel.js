const WebSocket = require('ws');

//class that handles the monitoring ws channel and its events. Restarts on failure.
class WebSocketChannel {
  constructor(options) {
    if (!options.url)
      throw new Error('url is required');
    if (!options.serviceToken)
      throw new Error('serviceToken is required');
    this.url = options.url;
    this.serviceToken = options.serviceToken;
    this.onMessage = options.onMessage;
    this.onOpen = options.onOpen;
    this.onClose = options.onClose;
    this.onError = options.onError;
  }

  connect() {
    const opt = {
      headers: {
        "Authorization": `Bearer ${this.serviceToken}`
      }
    };

    this.ws = new WebSocket(this.url, opt);
    this.ws
      .addListener("open", (e) => this.__onOpen(e))
      .addListener("close", (code, reason) => this.__onClose(code, reason))
      .addListener("error", (error) => this.__onError(error))
      .addListener("message", (message) => this.__onMessage(message))
      .addListener("ping", (data) => this.__onPing(data))
      .addListener("pong", () => this.__onPong());
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  notify(message) {
    this.ws.send(message);
  }

  close(terminate = true) {
    this.__termination = terminate;
    this.ws?.close();
  }

  __onOpen() {
    this.onOpen?.();
  }

  __onMessage(message) {
    try {
      this.onMessage?.(message);
    } catch (e) {
      console.error(e);
    }
  }

  __onPing(data) {
    this.ws.pong(data);
  }

  __onPong(d) {
    console.log(d);
  }

  __onClose() {
    this.onClose?.();
    if (this.ws) {
      this.ws.terminate();
    }
    this.ws = null;
    this.pingWorker = clearInterval(this.pingWorker);
    if (this.__termination)
      return;
    this.connect();
  }

  __onError(error) {
    this.onError?.(error);
    console.log('error', error);
  }
}

module.exports = WebSocketChannel;