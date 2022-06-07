<?php
/**
 * Main Feature Snippet file.
 *
 * @package Qoin.
 */

namespace Qoin\API;

add_action(
	'rest_api_init',
	function() {
		register_rest_route(
			'qoin-wp/v1',
			'/exchange-rate/(?P<currency>[A-Z]+)(?:\/(?P<start_date>[0-9-]+))?(?:\/(?P<end_date>[0-9-]+))?(?:\/(?P<frequency>[a-z]+))?',
			array(
				'methods'  => 'GET',
				'callback' => 'Qoin\API\get_exchange_rate',
				'args'     => array(
					'currency'   => array(
						'validate_callback' => function( $param, $request, $key ) {
							return is_string( $param );
						},
					),
					'start_date' => array(
						'validate_callback' => function( $param, $request, $key ) {
							$d = \DateTime::createFromFormat( 'Y-m-d', $param );
							return $d && $d->format( 'Y-m-d' ) === $param;
						},
					),
					'end_date'   => array(
						'validate_callback' => function( $param, $request, $key ) {
							$d = \DateTime::createFromFormat( 'Y-m-d', $param );
							return $d && $d->format( 'Y-m-d' ) === $param;
						},
					),
					'frequency'  => array(
						'validate_callback' => function( $param, $request, $key ) {
							return is_string( $param );
						},
					),
				),
			)
		);
	}
);

/**
 * Callback for retrieving Qoin pricing.
 *
 * @param WP_REST_REQUEST $request_data REST Request data.
 *
 * @return array $response
 */
function get_exchange_rate( $request_data ) {

	if ( ! defined( 'QOIN_PRICE_LIVE_API' ) ) {
		return new \WP_Error( 401, __( 'Invalid Qoin Live API key', 'qoin' ) );
	}

	if ( ! defined( 'QOIN_PRICE_24H_API' ) ) {
		return new \WP_Error( 401, __( 'Invalid Qoin 24H API key', 'qoin' ) );
	}

	if ( ! defined( 'QOIN_PRICE_HISTORY_API' ) ) {
		return new \WP_Error( 401, __( 'Invalid Qoin History API key', 'qoin' ) );
	}

	if ( ! isset( $request_data['currency'] ) ) {
		return new \WP_Error( 400, __( 'Invalid Currency', 'qoin' ) );
	} else {
		$currency = strtoupper( sanitize_text_field( $request_data['currency'] ) );
	}

	$qoin_current_price = wp_cache_get( 'qoin_pricing_endpoint_current_' . $currency );
	if ( false === $qoin_current_price ) {
		$qoin_live_data     = get_qoin_price_data(
			'https://eqecmyd8y7.execute-api.ap-southeast-2.amazonaws.com/Production?input=' . $currency,
			QOIN_PRICE_LIVE_API
		);
		$qoin_current_price = $qoin_live_data->output;
		wp_cache_set( 'qoin_pricing_endpoint_current_' . $currency, $qoin_current_price, '', wp_rand( 3 * MINUTE_IN_SECONDS, 5 * MINUTE_IN_SECONDS ) );
	}

	$qoin_24h_price = wp_cache_get( 'qoin_pricing_endpoint_24h_' . $currency );
	if ( false === $qoin_24h_price ) {
		$qoin_24h_data  = get_qoin_price_data(
			'https://x3r0rmbo34.execute-api.ap-southeast-2.amazonaws.com/Production?Currency=' . $currency,
			QOIN_PRICE_24H_API
		);
		$qoin_24h_price = $qoin_24h_data[0]->changePercent24hrs;
		wp_cache_set( 'qoin_pricing_endpoint_24h_' . $currency, $qoin_24h_price, '', wp_rand( 3 * MINUTE_IN_SECONDS, 5 * MINUTE_IN_SECONDS ) );
	}

	$response = array(
		'current' => array(
			'currency' => $currency,
			'price'    => $qoin_current_price,
			'24h'      => $qoin_24h_price,
		),
	);

	// For AUD we want to retrieve the Qoin price from BTX as well.
	// Since we need the live price, no caching is needed.
	if ( 'AUD' === $currency ) {
		$qoin_live_data                   = get_qoin_price_data(
			'https://btx-production-api.azurewebsites.net/CryptoExchangeRate/rates/' . $currency,
			''
		);
		$qoin_btx_price                   = $qoin_live_data[0]->qoinAskPrice;
		$response['current']['btx_price'] = $qoin_btx_price;
	}

	if ( isset( $request_data['start_date'] ) ) {

		if ( ! isset( $request_data['end_date'] ) ) {
			return new \WP_Error( 400, __( 'Invalid End Date', 'qoin' ) );
		}

		if ( ! isset( $request_data['frequency'] ) ) {
			return new \WP_Error( 400, __( 'Invalid Frequency', 'qoin' ) );
		}

		$historic              = array();
		$historic['start']     = sanitize_text_field( $request_data['start_date'] );
		$historic['end']       = sanitize_text_field( $request_data['end_date'] );
		$historic['frequency'] = sanitize_text_field( $request_data['frequency'] );

		$cache_key = md5( $currency . $historic['start'] . $historic['end'] . $historic['frequency'] );

		$response['historic'] = wp_cache_get( 'qoin_pricing_endpoint_historic_' . $cache_key );
		if ( false === $response['historic'] ) {
			$response['historic'] = get_qoin_price_data(
				'https://vr4oexz8p8.execute-api.ap-southeast-2.amazonaws.com/Production?currency=' . $currency,
				QOIN_PRICE_HISTORY_API,
				$historic
			);
			wp_cache_set( 'qoin_pricing_endpoint_historic_' . $cache_key, $response['historic'], '', wp_rand( 60 * MINUTE_IN_SECONDS, 70 * MINUTE_IN_SECONDS ) );
		}
	}

	return $response;
}

/**
 * Get Qoin price data using API Keys and other params
 *
 * @param string $request_url URL for the Qoin price request.
 * @param string $api_key API Key needed for the Qoin price request.
 * @param mixed  $historic Boolean or array depending on if this is a Qoin historic price request.
 *
 * @return object
 */
function get_qoin_price_data( $request_url, $api_key, $historic = false ) {

	if ( false !== $historic ) {
		$request_url .= '&start=' . $historic['start'] . '&end=' . $historic['end'] . '&frequency=' . $historic['frequency'];
	}

	$request = wp_remote_get(
		$request_url,
		array(
			'headers' => array(
				'x-api-key'    => $api_key,
				'Content-Type' => 'application/json',
			),
		)
	);

	$body = wp_remote_retrieve_body( $request );

	return json_decode( $body );
}
