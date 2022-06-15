const fs = require( 'fs' );
const path = require( 'path' );

function hasTypeFiles( type ) {
	const dirToCheck = path.join( __dirname, '..', 'assets', type );
	const files = fs.readdirSync( dirToCheck );

	//TODO We should only return files that are '[filename].js and not [filename].min.js etc'
	const filtered = files.filter( ( file ) => {
		const fileName = file.split( '.' )[ 0 ] + '.' + type;
		return file === fileName; // ensure the current file is [filename].[type]. We dont want to return .min.[type] files.
	} );

	return filtered;
}

module.exports = {
	hasTypeFiles,
};
