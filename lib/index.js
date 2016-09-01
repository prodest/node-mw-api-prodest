( function() {

    'use stric';

    const cors = require( 'cors' );
    const compress = require( 'compression' );
    const errors = require( './errors' );
    const authentication = require( './authentication' );

    const defaults = {
        compress: false,
        cors: false,
        routes: undefined,
        error: {
            notFound: false,
            debug: false
        },
        authentication: {
            header: 'Authorization',
            jwtPublicKey: undefined,
            validationEndpoint: undefined,
            errorStatus: 498
        }
    };

    function middlewareWrapper( options ) {
        if ( !options || options === true ) {
            options = {};
        }
        if ( options.cors === undefined ) {
            options.cors = defaults.cors;
        }
        if ( options.compress === undefined ) {
            options.compress = defaults.compress;
        }

        let pipeline = [];

        if ( options.compress ) {
            pipeline = pipeline.concat( compress() );
        }
        if ( options.cors ) {
            pipeline = pipeline.concat( cors() );
        }
        if ( options.authentication ) {
            pipeline = pipeline.concat( authentication.middleware( options.authentication ) );
        }
        if ( options.error ) {
            pipeline = pipeline.concat( errors( options.error ) );
        }

        return pipeline;
    }

    module.exports = {
        middleware: middlewareWrapper,
        validateAtEndpoint: authentication.validateAtEndpoint
    };

}() );
