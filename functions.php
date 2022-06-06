<?php
/**
 * Site-wide functionalities.
 * 
 * @package QoinGraph
 */

namespace QoinGraph;

/**
 * Enqueue admin-related scripts and styles.
 */
function enqueue_admin_scripts() {
	wp_enqueue_script( 'qoin-graph-admin', plugin_dir_url( __FILE__ ) . 'assets/js/admin.js', array( 'jquery' ), '1.0.0', true );
	wp_add_inline_script(
		'qoin-graph-admin',
		sprintf(
			'var qoinGraphSettings = { root: %s, nonce: %s }',
			wp_json_encode( get_site_url() ),
			wp_json_encode( wp_create_nonce( 'wp_rest' ) ),
		),
		'before'
	);

	wp_enqueue_style( 'qoin-graph-admin-styles', plugin_dir_url( __FILE__ ) . 'assets/css/admin.css', array(), '1.0.0' );
}
add_action( 'admin_enqueue_scripts', __NAMESPACE__ . '\\enqueue_admin_scripts' );

/**
 * Enqueue front-end scripts and styles.
 */
function enqueue_scripts() {
	$currencies = \QoinGraph\Utils\get_currencies();

	wp_enqueue_style( 'qoin-graph-frontend-styles', plugin_dir_url( __FILE__ ) . 'assets/css/frontend.css', array(), '1.0.0' );

	wp_register_script( 'qoin-graph-chart-js', plugin_dir_url( __FILE__ ) . 'assets/js/vendor/chart.min.js', array(), '3.8.0', true );
	wp_register_script( 'qoin-graph-frontend', plugin_dir_url( __FILE__ ) . 'assets/js/frontend.js', array( 'qoin-graph-chart-js' ), '1.0.0', true );
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
		array(
			array(
				'methods'  => \WP_REST_Server::READABLE,
				'callback' => __NAMESPACE__ . '\\get_qoin_graph_currencies',
			),
			array(
				'methods'  => \WP_REST_Server::EDITABLE,
				'callback' => __NAMESPACE__ . '\\update_qoin_graph_currencies',
			),
			array(
				'methods'  => \WP_REST_Server::DELETABLE,
				'callback' => __NAMESPACE__ . '\\delete_qoin_graph_currencies',
			),
		) 
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
		return new \WP_Error( 'cant-add', __( 'Both the currency code and symbol cannot be empty.', 'qoin-graph' ), array( 'status' => 404 ) );
	}
 
	$settings   = get_option( OPTION_NAME, array() );
	$currencies = \QoinGraph\Utils\get_currencies();

	if ( isset( $currencies[ $values['currencyCode'] ] ) ) {
		return new \WP_Error( 'cant-add', __( 'Currency already exists.', 'qoin-graph' ), array( 'status' => 404 ) );
	}

	$settings['currencies'][ sanitize_text_field( $values['currencyCode'] ) ] = sanitize_text_field( $values['currencySymbol'] );
	$result = update_option( OPTION_NAME, $settings );
	
	return $result ? new \WP_REST_Response( 'Currency added successfuly', 200 ) : new \WP_Error( 'cant-add', __( 'Unable to add currency', 'qoin-graph' ), array( 'status' => 404 ) );

}
add_action( 'rest_api_init', __NAMESPACE__ . '\\qoin_graph_rest_route' );

/**
 * DELETE method callback.
 * 
 * @param \WP_REST_Request $request REST request.
 */
function delete_qoin_graph_currencies( $request ) {
	$settings   = get_option( 'qoin_graph_settings', array() );
	$currencies = \QoinGraph\Utils\get_currencies();
	
	if ( empty( $currencies ) ) {
		return new \WP_Error( 'cant-delete', __( 'No currencies to delete.', 'qoin-graph' ), array( 'status' => 404 ) );
	}
	$values             = $request->get_json_params();
	$currency_to_remove = sanitize_text_field( $values['currencyCode'] );

	if ( isset( $currencies[ $currency_to_remove ] ) ) {
		unset( $currencies[ $currency_to_remove ] );
	}

	$settings['currencies'] = $currencies;
	$result                 = update_option( OPTION_NAME, $settings );

	return $result ? new \WP_REST_Response( 'Currency deleted successfuly', 200 ) : new \WP_Error( 'cant-delete', __( 'Unable to delete currency', 'qoin-graph' ), array( 'status' => 404 ) );
}
