<?php
/**
 * Site-wide functionalities.
 * 
 * @package QoinGraph
 */

namespace QoinGraph;

use function QoinGraph\Utils\get_min_suffix;

/**
 * Enqueue admin-related scripts and styles.
 */
function enqueue_admin_scripts() {
	$min = get_min_suffix();

	wp_enqueue_script( 'qoin-graph-admin', plugin_dir_url( __FILE__ ) . 'assets/js/admin.' . $min . 'js', [ 'jquery' ], '1.0.0', true );
	wp_add_inline_script(
		'qoin-graph-admin',
		sprintf(
			'var qoinGraphSettings = { root: %s, nonce: %s }',
			wp_json_encode( get_site_url() ),
			wp_json_encode( wp_create_nonce( 'wp_rest' ) ),
		),
		'before'
	);
	
	// Enqueue stylesheet only in plugin admin screen.
	if ( isset( $_GET['page'] ) && MENU_SLUG === $_GET['page'] ) {
		wp_enqueue_style( 'qoin-graph-admin-styles', plugin_dir_url( __FILE__ ) . 'assets/css/admin.' . $min . 'css', [], '1.0.0' );
	}
}
add_action( 'admin_enqueue_scripts', __NAMESPACE__ . '\\enqueue_admin_scripts' );

/**
 * Enqueue front-end scripts and styles.
 */
function enqueue_scripts() {
	$min        = get_min_suffix();
	$currencies = \QoinGraph\Utils\get_currencies();

	wp_register_style( 
		'qoin-graph-frontend-styles', 
		plugin_dir_url( __FILE__ ) . 'assets/css/frontend.' . $min . 'css', 
		[],
		filemtime( plugin_dir_path( __FILE__ ) . 'assets/css/frontend.' . $min . 'css' ),
	);

	wp_register_script( 'qoin-graph-chart-js', plugin_dir_url( __FILE__ ) . 'assets/js/vendor/chart.min.js', [], '3.8.0', true );
	wp_register_script( 
		'qoin-graph-frontend', 
		plugin_dir_url( __FILE__ ) . 'assets/js/frontend.' . $min . 'js', 
		[ 'qoin-graph-chart-js' ], 
		filemtime( plugin_dir_path( __FILE__ ) . 'assets/js/frontend.' . $min . 'js' ),
		true 
	);
	wp_add_inline_script(
		'qoin-graph-frontend',
		sprintf(
			'var qoinGraphCurrencies = %s, qoinGraphRootUrl = %s;',
			wp_json_encode( $currencies ),
			wp_json_encode( get_site_url() ),
		),
		'before'
	);
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\\enqueue_scripts' );

/**
 * Add custom REST route to handle retrieving and updating of various Qoin Graph settings.
 */
function qoin_graph_rest_route() {
	register_rest_route(
		'qoin-graph/v1',
		'currencies',
		[
			[
				'methods'  => \WP_REST_Server::READABLE,
				'callback' => __NAMESPACE__ . '\\get_qoin_graph_currencies',
			],
			[
				'methods'  => \WP_REST_Server::EDITABLE,
				'callback' => __NAMESPACE__ . '\\update_qoin_graph_currencies',
			],
			[
				'methods'  => \WP_REST_Server::DELETABLE,
				'callback' => __NAMESPACE__ . '\\delete_qoin_graph_currencies',
			],
		] 
	);
}

/**
 * GET method callback.
 */
function get_qoin_graph_currencies() {
	return \QoinGraph\Utils\get_currencies();
}

/**
 * POST method callback.
 * 
 * @param \WP_REST_Request $request REST request.
 */
function update_qoin_graph_currencies( $request ) {
	$values = $request->get_json_params();

	if ( empty( $values['currencyCode'] ) || empty( $values['currencySymbol'] ) ) {
		return new \WP_Error( 'cant-add', __( 'Both the currency code and symbol cannot be empty.', 'qoin-graph' ), [ 'status' => 404 ] );
	}
 
	$settings   = get_option( OPTION_NAME, [] );
	$currencies = \QoinGraph\Utils\get_currencies();

	if ( isset( $currencies[ $values['currencyCode'] ] ) ) {
		return new \WP_Error( 'cant-add', __( 'Currency already exists.', 'qoin-graph' ), [ 'status' => 404 ] );
	}

	$settings['currencies'][ sanitize_text_field( $values['currencyCode'] ) ] = sanitize_text_field( $values['currencySymbol'] );
	$result = update_option( OPTION_NAME, $settings );
	
	return $result ? new \WP_REST_Response( 'Currency added successfuly', 200 ) : new \WP_Error( 'cant-add', __( 'Unable to add currency', 'qoin-graph' ), [ 'status' => 404 ] );
}
add_action( 'rest_api_init', __NAMESPACE__ . '\\qoin_graph_rest_route' );

/**
 * DELETE method callback.
 * 
 * @param \WP_REST_Request $request REST request.
 */
function delete_qoin_graph_currencies( $request ) {
	$settings   = get_option( 'qoin_graph_settings', [] );
	$currencies = \QoinGraph\Utils\get_currencies();
	
	if ( empty( $currencies ) ) {
		return new \WP_Error( 'cant-delete', __( 'No currencies to delete.', 'qoin-graph' ), [ 'status' => 404 ] );
	}
	$values             = $request->get_json_params();
	$currency_to_remove = sanitize_text_field( $values['currencyCode'] );

	if ( isset( $currencies[ $currency_to_remove ] ) ) {
		unset( $currencies[ $currency_to_remove ] );
	}

	$settings['currencies'] = $currencies;
	$result                 = update_option( OPTION_NAME, $settings );

	return $result ? new \WP_REST_Response( 'Currency deleted successfuly', 200 ) : new \WP_Error( 'cant-delete', __( 'Unable to delete currency', 'qoin-graph' ), [ 'status' => 404 ] );
}
