<?php
/**
 * Utility functions.
 * 
 * @package qoin-graph
 */

namespace QoinGraph\Utils;

/**
 * Retrieve a list of currencies.
 */
function get_currencies() {
	$settings = get_option( \QoinGraph\OPTION_NAME, [] );
	
	return ! empty( $settings['currencies'] ) ? $settings['currencies'] : [];
}

/**
 * Get suffix of minified scripts.
 *
 * @return string
 */
function get_min_suffix() {
	$is_debug_mode = defined( 'SCRIPT_DEBUG' ) && true === SCRIPT_DEBUG;
	$min           = $is_debug_mode ? '' : 'min.';

	return $min;
}
