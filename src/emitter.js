class CustomStrategyEmitter {
    constructor() {
        this.listeners = {};
    }

    on(event, listener) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }

        this.listeners[event].push(listener);
    }

    async emit(event, ...args) {
        if (!this.listeners[event]) return [];
        const promises = this.listeners[event].map(listener => listener(...args));
        return await Promise.all(promises);
    }
}

module.exports = CustomStrategyEmitter;