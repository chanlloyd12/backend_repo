require('rootpath')();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const errorHandler = require('./_middleware/error-handler');

// import database (db.js runs sync internally)
const db = require('./_helpers/db');

// middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

// 🚀 CORS Setup for Production (Vercel) and Development (Local)
const allowedOrigins = [
    'http://localhost:4200',
    'https://frontend-repo-steel.vercel.app' // Updated for production deployment on Vercel (using HTTPS)
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl requests, or same-origin requests)
        if (!origin) return callback(null, true); 
        
        // Check if the requesting origin is in the allowed list
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            // Only throw an error if the environment is not production and we want strict checking
            if (process.env.NODE_ENV !== 'production') {
                return callback(new Error(msg), false);
            }
            // In production, for debugging CORS issues, you might want to log this instead of erroring out.
            console.error(msg, `Attempted origin: ${origin}`);
            return callback(null, false);
        }
        return callback(null, true);
    },
    credentials: true // allow cookies / auth headers
}));

// api routes
app.use('/accounts', require('./accounts/accounts.controller'));
app.use('/employees', require('./employees/employees.controller'));
app.use('/requests', require('./requests/requests.controller'));
app.use('/workflows', require('./workflows/workflows.controller'));
app.use('/transfers', require('./transfers/transfers.controller'));
app.use('/departments', require('./departments/departments.controller'));

// swagger docs route
app.use('/api-docs', require('./_helpers/swagger'));

// global error handler
app.use(errorHandler);

// 🚀 start server directly (db.js already handles sync)
const port = process.env.NODE_ENV === 'production'
    ? (process.env.PORT || 80)
    : 4000;

app.listen(port, () => console.log('🚀 Server listening on port ' + port));


// require('rootpath')();
// const express = require('express');
// const app = express();
// const bodyParser = require('body-parser');
// const cookieParser = require('cookie-parser');
// const cors = require('cors');
// const errorHandler = require('./_middleware/error-handler');

// // import database (db.js runs sync internally)
// const db = require('./_helpers/db');

// // middleware
// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser.json());
// app.use(cookieParser());

// // ✅ Proper CORS setup (for Angular frontend on port 4200)
// app.use(cors({
//     origin: "http://localhost:4200",  // allow requests from Angular app
//     credentials: true                 // allow cookies / auth headers
// }));

// // api routes
// app.use('/accounts', require('./accounts/accounts.controller'));
// app.use('/employees', require('./employees/employees.controller'));
// app.use('/requests', require('./requests/requests.controller'));
// app.use('/workflows', require('./workflows/workflows.controller'));
// app.use('/transfers', require('./transfers/transfers.controller'));
// app.use('/departments', require('./departments/departments.controller'));

// // swagger docs route
// app.use('/api-docs', require('./_helpers/swagger'));

// // global error handler
// app.use(errorHandler);

// // 🚀 start server directly (db.js already handles sync)
// const port = process.env.NODE_ENV === 'production'
//     ? (process.env.PORT || 80)
//     : 4000;

// app.listen(port, () => console.log('🚀 Server listening on port ' + port));
