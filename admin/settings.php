<?php
/**
 * Register Settings Page.
 *
 * @package Qoin Graph
 */

namespace QoinGraph\Admin;

/**
 * List of setting fields for a country setting.
 */
function setting_fields() {
	$options = array(
		'currencies' => array(
			'id'       => 'qoin_graph_currencies',
			'title'    => __( 'Currencies', 'qoin-graph' ),
			'callback' => __NAMESPACE__ . '\render_currencies_setting',
			'page'     => 'qoin-graph-settings',
			'section'  => 'qoin-graph-settings-section',
			'sanitize' => 'sanitize_text_field',
		),
	);

	return $options;
}

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
		'qoin-graph-settings',
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
	$menu_settings_page = menu_page_url( 'qoin-graph-settings', false );

	?>
	<div class="wrap">
		<h2 class="wc-table-list-header"><?php echo esc_html__( 'Qoin Graph Settings', 'qoin-graph' ); ?></h2>

		<form method="post" class="country-rollout-form" action="options.php">
			<?php settings_fields( \QoinGraph\OPTION_GROUP ); ?>
			<?php do_settings_sections( 'qoin-graph-settings' ); ?>
			<?php submit_button(); ?>
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
		'qoin-graph-settings-section',
		__( 'Qoin Graph Settings', 'qoin-graph' ),
		__NAMESPACE__ . '\setting_section_callback',
		'qoin-graph-settings',
	);

	$fields = setting_fields();

	// Register each option as a settings field.
	foreach ( $fields as $field ) {
		add_settings_field(
			$field['id'],
			$field['title'],
			$field['callback'],
			$field['page'],
			$field['section'],
		);
	}
}

/**
 * Section callback.
 */
function setting_section_callback() {
	?>
	<p><?php echo esc_html__( 'Various settings for configuring the Qoin Graph.', 'qoin-graph' ); ?></p>
	<?php
}

/**
 * Currencies setting callback.
 */
function render_currencies_setting() {}

// Hooks.
add_action( 'admin_menu', __NAMESPACE__ . '\init_admin_menu' );
add_action( 'admin_init', __NAMESPACE__ . '\settings_api_init' );

