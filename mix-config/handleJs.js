const path = require( 'path' );
const mix = require( 'laravel-mix' );

function handleJs( fileName ) {
	let pathToSourceFile = '';
	let pathToOutputFile = '';
	const fileExt = '.js';
	const minSuffix = '.min';

	function resolvePathToSourceFile() {
		pathToSourceFile = path.join( __dirname, '..', 'assets', 'js', fileName );
	}

	function resolvePathToOutputFile() {
		const outputFileName = fileName.split( '.' )[ 0 ] + minSuffix + fileExt;
		pathToOutputFile = path.join( __dirname, '..', 'assets', 'js', outputFileName );
	}

	function build() {
		mix.js( pathToSourceFile, pathToOutputFile ).sourceMaps();
	}

	resolvePathToSourceFile();
	resolvePathToOutputFile();

	return { build };
}

module.exports = handleJs;
