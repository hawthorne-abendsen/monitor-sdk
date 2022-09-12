const ErrorTypes = require('../error-types')
const MonitoringService = require('../index')

//get random true or false
const randomBoolean = () => Math.random() >= 0.5

const statsCb = () => {
    if (randomBoolean()) {
        return {
            error: 'Some alert data',
            type: randomBoolean() ? ErrorTypes.ERROR : ErrorTypes.WARNING
        }
    }
    return {
        stats: {
            requestsCount: 10,
            loginsCount: 5
        }
    }
}

const monitoringServerUrl = new MonitoringService('ws://localhost:9001', "exampleToken", statsCb, 5 * 1000)
monitoringServerUrl.connect()
