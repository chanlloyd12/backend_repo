const jwt = require('express-jwt');
// ❌ DELETE: const { secret } = require('../config.json'); 
const db = require('../_helpers/db');

// ✅ Use the environment variable for the secret
const secret = process.env.SECRET; 

if (!secret) {
    // This check ensures the app crashes immediately if the secret isn't loaded
    console.error('FATAL ERROR: JWT secret is not defined in environment variables.');
    // In a real app, you might crash the process here: process.exit(1);
}

module.exports = authorize;

function authorize(roles = []) {
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return [
        // authenticate JWT token and attach either the user or admin to the request object (req.user)
        jwt({ secret, algorithms: ['HS256'] }), // Use the env variable secret

        // authorize based on user role
        async (req, res, next) => {
            // Check if JWT validation failed before proceeding
            if (!req.user || !req.user.id) {
                return res.status(401).json({ message: 'Unauthorized (Token Invalid or Missing)' });
            }

            // get user with account id from JWT token
            const account = await db.Account.findByPk(req.user.id);

            // account no longer exists or role not authorized
            if (!account || (roles.length && !roles.includes(account.role))) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            // authentication and authorization successful
            req.user.role = account.role;
            const refreshTokens = await account.getRefreshTokens();
            req.user.ownsToken = token => !!refreshTokens.find(x => x.token === token);
            next();
        }
    ];
}

// const jwt = require('express-jwt');
// const { secret } = require('../config.json');
// const db = require('../_helpers/db');

// module.exports = authorize;

// function authorize(roles = []) {
//     // roles param can be a single role string (e.g. Role.Admin or 'Admin')
//     // or an array of roles (e.g. [Role.Admin, Role.User] or ['Admin', 'User'])
//     if (typeof roles === 'string') {
//         roles = [roles];
//     }

//     return [
//         // authenticate JWT token and attach either the user or admin to the request object (req.user)
//         jwt({ secret, algorithms: ['HS256'] }),

//         // authorize based on user role
//         async (req, res, next) => {
//             // get user with account id from JWT token
//             const account = await db.Account.findByPk(req.user.id);

//             // account no longer exists or role not authorized
//             if (!account || (roles.length && !roles.includes(account.role))) {
//                 return res.status(401).json({ message: 'Unauthorized' });
//             }

//             // authentication and authorization successful
//             req.user.role = account.role;
//             const refreshTokens = await account.getRefreshTokens();
//             req.user.ownsToken = token => !!refreshTokens.find(x => x.token === token);
//             next();
//         }
//     ];
// }