<?php
/**
 * Front-end related functions.
 * 
 * @package qoinGraph
 */

namespace QoinGraph;

/**
 * Shortcode for rendering Qoin Graph.
 */
function shortcode_callback() {
	wp_enqueue_script( 'qoin-graph-frontend' );

	$currencies = \QoinGraph\Utils\get_currencies();
	ob_start();

	?>

	<div class="qg-wrapper">
		<div class="qg-header">
			<div class="qg-controls">
				<button class="qg-controls__control" data-frequency="1M"><?php echo esc_html__( '1M', 'qoin-graph' ); ?></button>
				<button class="qg-controls__control" data-frequency="3M"><?php echo esc_html__( '3M', 'qoin-graph' ); ?></button>
				<button class="qg-controls__control" data-frequency="6M"><?php echo esc_html__( '6M', 'qoin-graph' ); ?></button>
				<button class="qg-controls__control" data-frequency="all"><?php echo esc_html__( 'ALL', 'qoin-graph' ); ?></button>
				<?php
				if ( ! empty( $currencies ) ) {
					?>
					<select id="currency-dropdown" class="qg-controls__control qg-controls__dropdown">
						<?php foreach ( $currencies as $code => $symbol ) { ?>
							<option value="<?php echo esc_attr( $code ); ?>" <?php selected( $code, 'AUD' ); ?>><?php echo esc_html( $code ); ?></option>
						<?php } ?>
					</select>
					<?php
				}
				?>
			</div>
		</div>
		<div class="qg-body">
			<img class="" id="qg-loader" src="<?php echo esc_url( get_admin_url() . 'images/loading.gif' ); ?>" alt="loading" />
			<canvas id="qg-chart" width="340" height="100"></canvas>
		</div>
	</div>

	<?php

	return ob_get_clean();
}
add_shortcode( 'qoin_graph', __NAMESPACE__ . '\shortcode_callback' );
