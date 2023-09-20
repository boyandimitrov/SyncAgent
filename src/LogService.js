const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require("@sentry/profiling-node");

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
        new ProfilingIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE, // Capture 100% of the transactions, reduce in production!
    // Set sampling rate for profiling - this is relative to tracesSampleRate
    profilesSampleRate: process.env.SENTRY_PROFILES_SAMPLE_RATE, // Capture 100% of the transactions, reduce in production!
});


const log = (report) => {
    if(report.type === "error") {
        Sentry.captureException(report)
        console.error(report);
    }
    else if(report.type === "info") {
        const transaction = Sentry.startTransaction({
            name: report.title || "infoTransaction"
        });
        const span = transaction.startChild({
            data: report.meta,
            description: report.message || "",
        });
        span.finish();
        transaction.finish();
        // console.log(report);
    }
    else if(report.type === "warn") {
        const transaction = Sentry.startTransaction({
            name: report.title  || "warnTransaction"
        });
        const span = transaction.startChild({
            data: report.meta,
            description: report.message || "",
        });
        span.finish();
        transaction.finish();
        console.warn(report);
    }
}

module.exports = {log}