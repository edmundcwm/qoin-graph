<?php
/**
 * Plugin Name: Qoin Graph
 * Description: A Graphical representation of Qoin pricings.
 * Version: 1.0.0
 * Author: XWP
 * Author URI: https://xwp.co
 * License: GPL3
 * License URI: http://www.gnu.org/licenses/gpl-3.0.html
 * Text Domain: qoin-graph
 *
 * @package QoinGraph
 */

namespace QoinGraph;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const OPTION_GROUP = 'qoin_graph_group_settings';
const OPTION_NAME  = 'qoin_graph_settings';

require_once plugin_dir_path( __FILE__ ) . 'php/utils.php';
require_once plugin_dir_path( __FILE__ ) . 'admin/settings.php';
require_once plugin_dir_path( __FILE__ ) . 'functions.php';
require_once plugin_dir_path( __FILE__ ) . 'php/api/rest-routes.php';
require_once plugin_dir_path( __FILE__ ) . 'php/qoin-graph.php';
