( function() {

    'use strict';

    const elasticsearch = require( 'elasticsearch' );
    const onFinished = require( 'on-finished' );

    /**
     *
     * @param {*} logInfo
     */
    function indexLog( logInfo, client ) {
        client.create( {
            index: 'log',
            type: 'log',
            body: logInfo
        } );
    }

    /**
     *
     * @param {*} req
     */
    function getUrl( req ) {
        return req.originalUrl || req.url;
    }

    /**
     *
     * @param {*} req
     */
    function getIp( req ) {
        return req.headers[ 'x-real-ip' ] ||
            req.headers[ 'x-forwarded-for' ] ||
            req.connection.remoteAddress ||
            req._remoteAddress ||
            ( req.connection && req.connection.remoteAddress ) ||
            undefined;
    }

    /**
     *
     * @param {*} req
     */
    function getMethod( req ) {
        return req.method;
    }

    /**
     *
     * @param {*} options
     */
    function getApi( options ) {
        const path = process.env.REQUEST_PATH ? process.env.REQUEST_PATH.substring( 1 ) : '';
        return options.api || path;
    }

    /**
     *
     * @param {*} res
     * @param {*} options
     */
    function getResponseTime( req ) {
        const endAt = process.hrtime();
        return ( endAt[ 0 ] - req._startAt[ 0 ] ) * 1e3 +
                    ( endAt[ 1 ] - req._startAt[ 1 ] ) * 1e-6;

    }

    /**
     *
     * @param {*} res
     */
    function getStatus( res ) {
        return res.statusCode;
    }

    /** */
    function getLogInfo( req, res, options ) {
        return {
            api: getApi( options ),
            method: getMethod( req ),
            url: getUrl( req ),
            ip: getIp( req ),
            timestamp: new Date(),
            responseTime: getResponseTime( req ),
            status: getStatus( res )
        };
    }

    /**
     *
     * @param {*} params
     */
    function applyLogger( options, client ) {
        return ( req, res, next ) => {
            req._startAt = process.hrtime();
            onFinished( res, () => indexLog( getLogInfo( req, res, options ), client ) );
            next();
        };
    }

    /**
     *
     * @param {*} options
     * @param {*} defaults
     */
    function logWrapper( options, defaults ) {

        if ( !options || options === true ) {
            options = {};
        }
        if ( options.elasticSearchUrl === undefined ) {
            options.elasticSearchUrl = defaults.elasticSearchUrl;
        }
        if ( options.api === undefined ) {
            options.api = defaults.api;
        }

        const client = new elasticsearch.Client( {
            host: options.elasticSearchUrl,
            log: 'error',
            apiVersion: '2.4'
        } );

        let pipeline = [];

        pipeline.push( applyLogger( options, client ) );

        return pipeline;
    }

    module.exports = logWrapper;

}() );
