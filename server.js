require('rootpath')();
const express = require('express');
const app = express();
// 🔑 CRITICAL FIX for cookies on Render/Vercel: Trust the proxy headers (required for secure cookies)
app.set('trust proxy', true); // Set to 1 if behind one layer of proxy (like Render)
app.use(express.json());
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
    'https://frontend-repo-steel.vercel.app',
    'https://backend-repo-2-vfk8.onrender.com' 
]

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true // MUST be set to true
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
