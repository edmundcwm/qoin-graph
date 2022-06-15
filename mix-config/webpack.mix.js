const mix = require( 'laravel-mix' );
const { hasTypeFiles } = require( './utils.js' );
const handleCss = require( './handleCss.js' );
const handleJs = require( './handleJs.js' );
const typeHandler = {
	css: handleCss,
	js: handleJs,
};

mix.options( {
	terser: {
		extractComments: false,
	},
} );

Object.keys( typeHandler ).forEach( ( type ) => {
	const files = hasTypeFiles( type );

	if ( files.length ) {
		files.forEach( ( file ) => {
			const handler = typeHandler[ type ];
			const { build } = handler( file );
			build();
		} );
	}
} );
