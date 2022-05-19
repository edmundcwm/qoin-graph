<?php
/**
 * Site-wide functionalities.
 * 
 * @package Qoin Graph
 */

namespace QoinGraph;

/**
 * Enqueue admin-related scripts and styles.
 */
function enqueue_admin_scripts() {
	wp_enqueue_script( 'qoin-graph-select2', plugin_dir_url( __FILE__ ) . 'assets/js/select2.min.js', array( 'jquery' ), '4.0.13' ); //phpcs:ignore
	wp_enqueue_style( 'qoin-graph-select2-style', plugin_dir_url( __FILE__ ) . 'assets/css/select2.min.css', array(), '4.0.13' ); 
}
add_action( 'admin_enqueue_scripts', __NAMESPACE__ . '\\enqueue_admin_scripts' );
