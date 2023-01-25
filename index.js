const MessageTypes = require('./message-types')
const WebSocketChannel = require('./websocket-channel')
const ErrorTypes = require('./error-types')

class MonitoringService {
    constructor(monitoringServerUrl, serviceToken, statsDataSource, statsSyncTimeout = 1000, verbose = false) {
        if (!monitoringServerUrl)
            throw new Error('monitoringServerUrl is required')
        if (!serviceToken)
            throw new Error('serviceToken is required')
        if (!statsDataSource)
            throw new Error('statsDataSource is required')

        this.wsChannel = new WebSocketChannel({
            url: monitoringServerUrl,
            serviceToken,
            onOpen: () => this.__onOpen(),
            onMessage: (message) => this.__onMessage(message),
            onClose: () => this.__onClose(),
            onError: e => this.__onError(e)
        })
        this.statsDataSource = statsDataSource
        this.statsSyncTimeout = statsSyncTimeout
        this.__verbose = verbose
    }

    __log(...args) {
        if (this.__verbose)
            console.log(...args)
    }

    connect() {
        if (this.wsChannel.isConnected)
            return
        this.wsChannel.connect()
        this.__runStatiscticsWorker(1)
    }

    terminate() {
        this.__timeoutId && clearTimeout(this.__timeoutId)
        this.__timeoutId = undefined
        this.wsChannel.close()
    }

    send(data, type = MessageTypes.LOG) {
        if (!this.wsChannel.isConnected || !this.__timeoutId)
            return
        this.wsChannel.notify(JSON.stringify({
            type,
            data
        }))
    }

    __runStatiscticsWorker(timeout = null) {
        this.__timeoutId = setTimeout(
            () => this.__sendStatisctics(),
            timeout
        )
    }

    __statsSendAttempts = 0

    __sendStatisctics() {
        try {
            if (!this.wsChannel.isConnected || !this.__timeoutId) {
                this.__incSendAttempts()
                return
            }
            const statistics = this.statsDataSource()
            //if data is empty, do not send it
            if (!statistics) {
                this.__incSendAttempts()
                return
            }
            this.send({stats: statistics}, MessageTypes.LOG)
            this.__resetSendAttempts()
        } catch (e) {
            this.__log('Error on log sending', e)
        } finally {
            if (this.__timeoutId)
                this.__runStatiscticsWorker(this.__getTimeout())
        }
    }

    __incSendAttempts() {
        //restrict count to avoid huge timeouts
        if (this.__statsSendAttempts < 5)
            this.__statsSendAttempts++
    }

    __resetSendAttempts() {
        if (this.__statsSendAttempts > 0)
            this.__statsSendAttempts = 0
    }

    __getTimeout() {
        if (this.__statsSendAttempts === 0)
            return this.statsSyncTimeout
        const timeout = Math.pow(2, this.__statsSendAttempts) * 1000
        if (timeout > this.statsSyncTimeout)
            return this.statsSyncTimeout
        return timeout
    }

    __onMessage(message) {
        switch (message.type) {
            case MessageTypes.RESULT:
                this.__log(`${this.name} received result`, message.data)
                break
            default:
                this.__log('unknown message type', message.type, message.data)
        }
    }

    __onOpen() {
        try {
            this.wsChannel.notify(JSON.stringify({
                type: MessageTypes.SETTINGS,
                data: {
                    serviceTimeout: this.statsSyncTimeout * 2
                }
            }))
        } catch (e) {
            this.__log('Error on settings sending', e)
        }
    }

    __onClose() {
        this.__log('Monitoring server connection closed')
    }

    __onError(error) {
        if (error.code === 'ECONNREFUSED') {
            if (error.connectionAttempts === 1)
                console.error('Connection refused.')
        } else {
            console.error('Error occured. ', error)
        }
    }
}

module.exports = {MonitoringService, ErrorTypes}