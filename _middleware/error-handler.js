module.exports = errorHandler;

function errorHandler(err, req, res, next) {
    console.error('❌ ERROR:', err); // <-- Log the real error in the backend console

    switch (true) {
        case typeof err === 'string':
            // custom application error
            const is404 = err.toLowerCase().endsWith('not found');
            const statusCode = is404 ? 404 : 400;
            return res.status(statusCode).json({ message: err });

        case err.name === 'UnauthorizedError':
            // jwt authentication error
            return res.status(401).json({ message: 'Unauthorized' });

        default:
            // Catch-all: include err.message or the whole error as a string
            return res.status(500).json({ 
                message: err.message || err.toString() || 'Internal Server Error' 
            });
    }
}
