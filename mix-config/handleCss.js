const path = require( 'path' );
const mix = require( 'laravel-mix' );

function handleCss( fileName ) {
	let pathToSourceFile = '';
	let pathToOutputFile = '';
	const fileExt = '.css';
	const minSuffix = '.min';

	function resolvePathToSourceFile() {
		pathToSourceFile = path.join( __dirname, '..', 'assets', 'css', fileName );
	}

	function resolvePathToOutputFile() {
		const outputFileName = fileName.split( '.' )[ 0 ] + minSuffix + fileExt;
		pathToOutputFile = path.join( __dirname, '..', 'assets', 'css', outputFileName );
	}

	function build() {
		mix.css( pathToSourceFile, pathToOutputFile ).sourceMaps();
	}

	resolvePathToSourceFile();
	resolvePathToOutputFile();

	return { build };
}

module.exports = handleCss;
