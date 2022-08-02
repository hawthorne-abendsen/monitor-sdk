const MonitoringService = require('../index');

const statsCb = () => {
    if (Date.now() % 2 === 0) {
        return { alert: 'Some alert data' };
    }
    return {
        stats: {
            requestsCount: 10,
            loginsCount: 5,
        }
    }
}

const monitoringServerUrl = new MonitoringService('ws://localhost:9001', "exampleToken", statsCb, 5 * 1000);
monitoringServerUrl.connect();
