( function() {

    'use stric';

    const cors = require( 'cors' );
    const compress = require( 'compression' );
    const log = require( './log' );
    const errors = require( './errors' );
    const authentication = require( './authentication' );
    const limit = require( './limit' );

    const defaults = {
        compress: false,
        cors: false,
        log: {
            elasticSearchUrl: process.env.ELASTICSEARCH,
            api: undefined
        },
        error: {
            notFound: false,
            debug: false
        },
        limit: {
            max: 300,
            duration: 10 * 60 * 1000,
            perSecond: 10,
            redisUrl: 'redis://redis:6379',
            apiId: undefined
        },
        authentication: {
            header: 'Authorization',
            validationHeader: 'Authorization',
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
        if ( options.log ) {
            pipeline = pipeline.concat( log( options.log, defaults.log ) );
        }
        if ( options.authentication ) {
            pipeline = pipeline.concat( authentication.middleware( options.authentication, defaults.authentication ) );
        }
        if ( options.limit ) {
            pipeline = pipeline.concat( limit( options.limit, defaults.limit ) );
        }
        if ( options.error ) {
            pipeline = pipeline.concat( errors( options.error, defaults.error ) );
        }

        return pipeline;
    }

    module.exports = {
        middleware: middlewareWrapper,
        validateAtEndpoint: authentication.validateAtEndpoint,
        authorize: authentication.authorize
    };

}() );
