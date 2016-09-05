( function() {

    'use stric';

    const uuid = require( 'uuid' );

    // catch 404 and forward to error handler
    function notFound( req, res, next ) {
        var err = new Error( 'Not Found' );
        err.status = 404;

        next( err );
    }

    // development error handler
    // will print full error
    function debug( err, req, res, next ) {
        res.status( err.status || 500 );

        err.guid = uuid.v4();

        console.error( err );

        res.json( {
            error: err.message,
            message: err.userMessage,
            handled: err.handled || false,
            guid: err.guid,
            stack: err.stack
        } );
    }

    // production error handler
    // only error message leaked to user
    function production( err, req, res, next ) {
        res.status( err.status || 500 );

        err.guid = uuid.v4();

        if ( !err.handled && err.status != 404 ) {
            console.error( err );
        }

        res.json( {
            error: err.message,
            message: err.userMessage,
            handled: err.handled || false,
            guid: err.guid
        } );
    }

    function errorsWrapper( options, defaults ) {
        // if no options were passed in, use the defaults
        if ( !options || options === true ) {
            options = {};
        }
        if ( options.notFound === undefined ) {
            options.notFound = defaults.notFound;
        }
        if ( options.debug === undefined ) {
            options.debug = defaults.debug;
        }

        let pipeline = [];

        if ( options.notFound ) {
            pipeline.push( notFound );
        }
        if ( options.debug ) {
            pipeline.push( debug );
        } else {
            pipeline.push( production );
        }

        return pipeline;
    }

    module.exports = errorsWrapper;

}() );
