const WebSocket = require('ws')

//class that handles the monitoring ws channel and its events. Restarts on failure.
class WebSocketChannel {
    constructor(options) {
        if (!options.url)
            throw new Error('url is required')
        if (!options.serviceToken)
            throw new Error('serviceToken is required')
        this.url = options.url
        this.serviceToken = options.serviceToken
        this.onMessage = options.onMessage
        this.onOpen = options.onOpen
        this.onClose = options.onClose
        this.onError = options.onError
    }

    connect() {
        const opt = {
            headers: {
                "Authorization": `Bearer ${this.serviceToken}`
            }
        }

        this.ws = new WebSocket(this.url, opt)
        this.ws
            .addListener("open", (e) => this.__onOpen(e))
            .addListener("close", (code, reason) => this.__onClose(code, reason))
            .addListener("error", (error) => this.__onError(error))
            .addListener("message", (message) => this.__onMessage(message))
            .addListener("ping", (data) => this.__onPing(data))
            .addListener("pong", () => this.__onPong())
    }

    get isConnected() {
        return this.ws?.readyState === WebSocket.OPEN
    }

    get connectionAttempts() {
        return this.__connectionAttempts
    }

    notify(message) {
        this.ws.send(message)
    }

    close(terminate = true) {
        this.__termination = terminate
        this.__connectionTimeoutId && clearTimeout(this.__connectionTimeoutId)
        this.ws?.close()
    }

    __connectionAttempts = 0

    __onOpen() {
        this.onOpen?.()
        this.__resetConnectionAttempts()
    }

    __onMessage(message) {
        try {
            this.onMessage?.(message)
        } catch (e) {
            this.onError(e)
        }
    }

    __onPing(data) {
        this.ws.pong(data)
    }

    __onPong(d) {
    }

    __onClose() {
        this.onClose?.()
        if (this.ws) {
            this.ws.terminate()
        }
        this.ws = null
        if (this.__termination)
            return
        this.__incConnectionAttempts()
        this.__connectionTimeoutId = setTimeout(() => this.connect(), this.__getTimeout())
    }

    __onError(error) {
        if (this.onError) {
            if (error.code === 'ECONNREFUSED')
                error.connectionAttempts = this.__connectionAttempts
            this.onError(error)
        }
    }

    __incConnectionAttempts() {
        //restrict count to avoid huge timeouts
        if (this.__connectionAttempts < 5)
            this.__connectionAttempts++
    }

    __resetConnectionAttempts() {
        if (this.__connectionAttempts > 0)
            this.__connectionAttempts = 0
    }

    __getTimeout() {
        if (this.__connectionAttempts === 0)
            return this.statsSyncTimeout
        const timeout = Math.pow(2, this.__connectionAttempts) * 1000
        return timeout
    }
}

module.exports = WebSocketChannel