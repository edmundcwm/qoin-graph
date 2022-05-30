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

	<div class="qcpw-container">
		<div class="qcpw-list-header">
			<?php
			if ( ! empty( $currencies ) ) {
				?>
				<select id="currency-dropdown">
					<?php foreach ( $currencies as $code => $symbol ) { ?>
						<option value="<?php echo esc_attr( $code ); ?>" <?php selected( $code, 'AUD' ); ?>><?php echo esc_html( $code ); ?></option>
					<?php } ?>
				</select>
				<?php
			}
			?>
		</div>
		<div class="qcpw-list-body">
			<div class="qcpw-list-body__info">
				<div class="qcpw-change-wrapper">
					<span id="percentage-change" class="qcpw-percentage"></span>
				</div>
			</div>
			<div class="qcpw-list-toggle">
				<button class="qcpw-toggle-btn" data-frequency="hour"><?php echo esc_html__( '1D', 'qoin-graph' ); ?></button>
				<button class="qcpw-toggle-btn" data-frequency="day"><?php echo esc_html__( '7D', 'qoin-graph' ); ?></button>
				<button class="qcpw-toggle-btn" data-frequency="month"><?php echo esc_html__( '1M', 'qoin-graph' ); ?></button>
			</div>
			<img class="hidden" id="loader" src="<?php echo esc_url( get_admin_url() . 'images/loading.gif' ); ?>" alt="loading" />
			<canvas id="qcpw-chart" width="340" height="100"></canvas>
		</div>
	</div>

	<?php

	return ob_get_clean();
}
add_shortcode( 'qoin_graph', __NAMESPACE__ . '\shortcode_callback' );
