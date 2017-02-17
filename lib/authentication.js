( function() {

    'use stric';

    var jwt = require( 'jwt-simple' );
    var rp = require( 'request-promise' );

    function sendInvalidToken( next, errorStatus ) {
        var err = new Error( 'Token inválido.' );
        err.userMessage = err.message;
        err.status = errorStatus;
        err.handled = true;

        next( err );
    }

    function sendForbidden( next ) {
        var err = new Error( 'Usuário não autorizado.' );
        err.userMessage = err.message;
        err.status = 403;
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

    function authenticationWrapper( options, defaults ) {
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

    function getUserInfo( validationEndpoint, reqHeader, validationHeaderName ) {
        var options = {
            method: 'GET',
            uri: validationEndpoint,
            headers: {
                'User-Agent': 'prodest-authentication-middleware'
            },
            json: true
        };
        options.headers[ validationHeaderName ] = reqHeader;

        return rp( options );
    }

    function validateAtEndpoint( validationEndpoint, errorStatus, reqHeaderName, validationHeaderName ) {
        if ( errorStatus === undefined ) {
            errorStatus = 498;
        }
        if ( reqHeaderName === undefined ) {
            reqHeaderName = 'Authorization';
        }
        if ( validationHeaderName === undefined ) {
            validationHeaderName = 'Authorization';
        }

        return ( req, res, next ) => {
            getUserInfo( validationEndpoint, req.get( reqHeaderName ), validationHeaderName )
            .then( resp => {
                req.userInfo = resp;
                next();
            } )
            .catch( () => {
                sendInvalidToken( next, errorStatus );
            } );
        };
    }

    function authorize( validationEndpoint, recurso, acao, errorStatus, reqHeaderName, validationHeaderName ) {
        if ( errorStatus === undefined ) {
            errorStatus = 498;
        }
        if ( reqHeaderName === undefined ) {
            reqHeaderName = 'Authorization';
        }
        if ( validationHeaderName === undefined ) {
            validationHeaderName = 'Authorization';
        }

        return ( req, res, next ) => {
            getUserInfo( validationEndpoint, req.get( reqHeaderName ), validationHeaderName )
            .then( resp => {
                req.userInfo = resp;

                if ( userAuthorized( recurso, acao, resp.permissao ) ) {
                    next();
                } else {
                    sendForbidden( next );
                }

            } )
            .catch( () => {
                sendInvalidToken( next, errorStatus );
            } );
        };
    }

    function userAuthorized( recurso, acao, permissoes ) {
        permissoes = [].concat( permissoes );
        permissoes = permissoes.map( a => JSON.parse( a ));

        let recursos = [];
        if ( recurso ) {
            recursos = permissoes.filter( a => a.Recurso == recurso );
        }

        let acoes = [];
        if ( acao ) {
            acoes = recursos.filter( a => a.Acoes == acao );
            return acoes.length > 0;
        } else {
            return recursos.length > 0;
        }
    }

    module.exports = {
        middleware: authenticationWrapper,
        validateAtEndpoint: validateAtEndpoint,
        authorize: authorize
    };

}() );
