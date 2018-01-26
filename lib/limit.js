( function() {

    'use strict';

    const Limiter = require( 'ratelimiter' );
    const ms = require( 'ms' );
    const redis = require( 'redis' );

    function resolveResponse( res, next ) {
        return ( err, limit ) => {
            if ( err ) {
                return next( err );
            }

            res.set( 'X-Rate-Limit-Limit', limit.total );
            res.set( 'X-Rate-Limit-Remaining', limit.remaining - 1 );
            res.set( 'X-Rate-Limit-Reset', limit.reset );

            if ( limit.remaining ) {
                // all good
                return next();
            } else {
                // not good
                const delta = ( limit.reset * 1000 ) - Date.now() | 0;
                const after = limit.reset - ( Date.now() / 1000 ) | 0;
                res.set( 'Retry-After', after );

                const retryIn = ms( delta );
                const error = new Error( 'Rate limit exceeded, retry in ' + retryIn );
                error.status = 429;
                error.handled = true;
                error.userMessage = 'Limite de requisições excedido, tente novamente em ' + retryIn;
                next( error );
            }
        };
    }

    function applyLimit( o, db ) {
        return ( req, res, next ) => {
            if ( !req.decodedToken || !req.decodedToken.sub ) {
                throw new Error( 'Decoded token and decoded token sub are required.' );
            }

            let id = req.decodedToken.sub;
            if ( o.apiId ) {
                id = id + ':' + o.apiId;
            }
            const limit = new Limiter( {
                id: id,
                db: db,
                max: o.max,
                duration: o.duration
            } );

            limit.get( resolveResponse( res, next ) );
        };
    }

    function applyLimitPerSecond( o, db ) {
        return ( req, res, next ) => {
            if ( !req.decodedToken || !req.decodedToken.sub ) {
                throw new Error( 'Decoded token and decoded token sub are required.' );
            }

            let id = req.decodedToken.sub;
            if ( o.apiId ) {
                id = id + ':' + o.apiId;
            }
            id = id + ':perSecond';
            const limit = new Limiter( {
                id: id,
                db: db,
                max: o.perSecond,
                duration: 1000
            } );

            limit.get( resolveResponse( res, next ) );
        };
    }

    function limitWrapper( options, defaults ) {
        if ( !options || options === true ) {
            options = {};
        }
        if ( options.max === undefined ) {
            options.max = defaults.max;
        }
        if ( options.duration === undefined ) {
            options.duration = defaults.duration;
        }
        if ( options.perSecond === undefined ) {
            options.perSecond = defaults.perSecond;
        }
        if ( options.redisUrl === undefined ) {
            options.redisUrl = defaults.redisUrl;
        }
        if ( options.apiId === undefined ) {
            options.apiId = defaults.apiId;
        }

        const db = redis.createClient( {
            url: options.redisUrl
        } );

        let pipeline = [];

        if ( options.perSecond ) {
            pipeline.push( applyLimitPerSecond( options, db ) );
        }

        pipeline.push( applyLimit( options, db ) );

        return pipeline;
    }

    module.exports = limitWrapper;

}() );
