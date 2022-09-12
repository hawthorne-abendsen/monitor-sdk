const MessageTypes = require("./message-types")
const WebSocketChannel = require("./websocket-channel")

class MonitoringService {
    constructor(monitoringServerUrl, serviceToken, statsDataSource, statsSyncTimeout = 1000) {
        if (!monitoringServerUrl)
            throw new Error('monitoringServerUrl is required')
        if (!serviceToken)
            throw new Error('serviceToken is required')
        if (!statsDataSource)
            throw new Error('statsDataSource is required')

        this.wsChannel = new WebSocketChannel({
            url: monitoringServerUrl,
            serviceToken,
            onMessage: (message) => this.__onMessage(message),
            onClose: () => this.__onClose(),
            onError: () => this.__onError()
        })
        this.statsDataSource = statsDataSource
        this.statsSyncTimeout = statsSyncTimeout
    }

    connect() {
        if (this.wsChannel.isConnected)
            return
        this.wsChannel.connect()
        this.__runStatiscticsWorker()
    }

    terminate() {
        this.__timeoutId && clearTimeout(this.__timeoutId)
        this.__timeoutId = undefined
        this.wsChannel.close()
    }

    __runStatiscticsWorker() {
        this.__timeoutId = setTimeout(
            () => this.__sendStatisctics(),
            this.statsSyncTimeout
        )
    }

    __sendStatisctics() {
        try {
            if (!this.wsChannel.isConnected || !this.__timeoutId)
                return
            const statistics = this.statsDataSource()
            this.wsChannel.notify(JSON.stringify({
                type: MessageTypes.LOG,
                data: statistics
            }))
        } catch (e) {
            console.log('Error on log sending', e)
        } finally {
            if (this.__timeoutId)
                this.__runStatiscticsWorker()
        }
    }

    __onMessage(message) {
        switch (message.type) {
            case MessageTypes.RESULT:
                console.log(`${this.name} received result`, message.data)
                break
            default:
                console.log('unknown message type', message.type, message.data)
        }
    }

    __onClose() {
        console.log('Monitoring server connection closed')
    }

    __onError() {
        console.error('Error on monitoring server connection')
    }
}

module.exports = MonitoringService