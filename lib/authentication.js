( function() {

    'use stric';

    var jwt = require( 'jwt-simple' );
    var rp = require( 'request-promise' );

    const defaults = {
        header: 'Authorization',
        jwtPublicKey: undefined,
        validationEndpoint: undefined,
        errorStatus: 498
    };

    function sendInvalidToken( next, errorStatus ) {
        var err = new Error( 'Token inválido.' );
        err.userMessage = err.message;
        err.status = errorStatus;
        err.handled = true;

        next( err );
    }

    function validateJWTToken( o ) {
        return ( req, res, next ) => {
            try {
                const authorization = req.get( o.header );
                const token = authorization.slice( 7 );
                const decodedToken = jwt.decode( token, o.jwtPublicKey );

                if ( decodedToken.error ) {
                    sendInvalidToken( next, o.errorStatus );
                } else {
                    req.decodedToken = decodedToken;
                    next();
                }
            } catch ( err ) {
                sendInvalidToken( next, o.errorStatus );
            }
        };
    }

    function authenticationWrapper( options ) {
        if ( !options || options === true ) {
            options = {};
        }
        if ( options.header === undefined ) {
            options.header = defaults.header;
        }
        if ( options.errorStatus === undefined ) {
            options.errorStatus = defaults.errorStatus;
        }

        let pipeline = [];

        if ( options.jwtPublicKey ) {
            pipeline.push( validateJWTToken( options ) );
        }

        return pipeline;
    }

    function validateAtEndpoint( validationEndpoint, errorStatus, reqHeader, validationHeader ) {
        if ( errorStatus === undefined ) {
            errorStatus = 498;
        }
        if ( reqHeader === undefined ) {
            reqHeader = 'Authorization';
        }
        if ( validationHeader === undefined ) {
            validationHeader = 'Authorization';
        }

        return ( req, res, next ) => {
            var options = {
                method: 'GET',
                uri: validationEndpoint,
                headers: {
                    'User-Agent': 'prodest-authentication-middleware'
                }
            };
            options.headers[ validationHeader ] = req.get( reqHeader );

            return rp( options )
            .then( resp => {
                req.userInfo = resp;
                next();
            } )
            .catch( () => {
                sendInvalidToken( next, errorStatus );
            } );
        };
    }

    module.exports = {
        middleware: authenticationWrapper,
        validateAtEndpoint: validateAtEndpoint
    };

}() );
