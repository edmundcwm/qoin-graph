<?php
/**
 * Register Settings Page.
 *
 * @package QoinGraph
 */

namespace QoinGraph\Admin;

use const QoinGraph\MENU_SLUG;
use const QoinGraph\OPTION_NAME;

/**
 * Adds a new menu page for plugin options.
 *
 * @return void
 */
function init_admin_menu() {
	// Top level admin menu item.
	add_menu_page(
		__( 'Qoin Graph', 'qoin-graph' ),
		__( 'Qoin Graph', 'qoin-graph' ),
		'manage_options',
		MENU_SLUG,
		__NAMESPACE__ . '\render_settings_page',
		'dashicons-admin-generic'
	);

}

/**
 * Renders the settings page.
 *
 * @return void
 */
function render_settings_page() {
	?>
	<div class="wrap">
		<h2 class="wc-table-list-header"><?php echo esc_html__( 'Qoin Graph', 'qoin-graph' ); ?></h2>

		<form method="post" class="country-rollout-form" action="options.php">
			<?php settings_fields( \QoinGraph\OPTION_GROUP ); ?>
			<?php do_settings_sections( MENU_SLUG ); ?>
		</form>
	</div>
	<?php
}

/**
 * Settings API.
 */
function settings_api_init() {
	// Register our setting so that $_POST handling is done for us.
	register_setting(
		\QoinGraph\OPTION_GROUP,
		\QoinGraph\OPTION_NAME,
		array(
			'sanitize_callback' => __NAMESPACE__ . '\sanitize',
		),
	);

	add_settings_section(
		'qoin-graph-currencies-section',
		__( 'Currencies', 'qoin-graph' ),
		__NAMESPACE__ . '\currencies_section_callback',
		MENU_SLUG,
	);
}

/**
 * Currencies section callback.
 */
function currencies_section_callback() {
	$settings   = get_option( OPTION_NAME );
	$currencies = ! empty( $settings['currencies'] ) ? $settings['currencies'] : array();

	?>
	<p><?php echo esc_html__( 'Add or remove currencies.', 'qoin-graph' ); ?></p>
	<div class="field-wrapper">
		<fieldset id="add-currency" class="field-section field-section--sm">
			<legend class="screen-reader-text"><?php echo esc_html__( 'Add Currency', 'qoin-graph' ); ?></legend>
			<div class="form-field">
				<label for="currency-code"><?php echo esc_html__( 'Currency Code', 'qoin-graph' ); ?></label>
				<input type="text" size="10" id="currency-code" name="<?php echo esc_attr( \QoinGraph\OPTION_NAME . '[currencies][code]' ); ?>" class="input" required>
			</div>
			<div class="form-field">
				<label for="currency-symbol"><?php echo esc_html__( 'Currency Symbol', 'qoin-graph' ); ?></label>
				<input type="text" size="10" id="currency-symbol" name="<?php echo esc_attr( \QoinGraph\OPTION_NAME . '[currencies][symbol]' ); ?>" class="input" required>
			</div>
			<button type="button" name="add-new-currency" id="add-new-currency" class="button button-secondary"><?php echo esc_html__( 'Add New Currency', 'qoin-graph' ); ?></button>
		</fieldset>
		<div id="new-currency-notice" class="notice notice-success is-dismissible hidden" role="alert" tabindex="-1">
			<p class="notice-message"></p>
			<button type="button" class="notice-dismiss">
				<span class="screen-reader-text">Dismiss this notice.</span>
			</button>
		</div>
		<!-- Only display table if at least one currency has been added -->
		<table id="currency-table" class="wp-list-table widefat fixed striped table-view-list <?php echo empty( $currencies ) ? 'hidden' : ''; ?>">
			<thead>
				<tr>
					<th scope="col" id="currency-code" class="manage-column column-name column-primary">Currency Code</th>
					<th scope="col" id="currency-symbol" class="manage-column column-created">Currency Symbol</th>
					<th scope="col" id="currency-delete" class="manage-column column-created">Delete</th>
				</tr>
			</thead>

			<tbody id="the-list">
				<tr id="clone-row" class="hidden currency-row">
					<td class="currency-row__code"></td>
					<td class="currency-row__symbol"></td>
					<td class="currency-row__btn"><button class="button delete"><?php echo esc_html__( 'Delete', 'qoin-graph' ); ?></button></td>
				</tr>

				<?php
				if ( ! empty( $currencies ) ) {
					foreach ( $currencies as $code => $symbol ) {
						?>
						<tr class="currency-row">
							<td class="currency-row__code"><?php echo esc_html( $code ); ?></td>
							<td class="currency-row__symbol"><?php echo esc_html( $symbol ); ?></td>
							<td class="currency-row__btn"><button class="button delete" data-code="<?php echo esc_attr( $code ); ?>"><?php echo esc_html__( 'Delete', 'qoin-graph' ); ?></button></td>
						</tr>
						<?php
					}
				}
				?>
			</tbody>		
		</table>
	</div>
	<?php
}

/**
 * Sanitize form inputs.
 * 
 * @param array $values Form Inputs.
 * 
 * @return array
 */
function sanitize( $values ) {
	static $has_validated = false;

	if ( $has_validated ) {
		return $values;
	}

	$current_settings                                 = get_option( OPTION_NAME ) ?: array();
	$currency_code                                    = sanitize_text_field( $values['currencies']['code'] );
	$currency_symbol                                  = sanitize_text_field( $values['currencies']['symbol'] );
	$current_settings['currencies'][ $currency_code ] = $currency_symbol;
	$has_validated                                    = true;
	
	return $current_settings;
}

// Hooks.
add_action( 'admin_menu', __NAMESPACE__ . '\init_admin_menu' );
add_action( 'admin_init', __NAMESPACE__ . '\settings_api_init' );

