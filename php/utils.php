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
	$settings = get_option( \QoinGraph\OPTION_NAME, array() );
	
	return ! empty( $settings['currencies'] ) ? $settings['currencies'] : array();
}
