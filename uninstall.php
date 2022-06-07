<?php
/**
 * QoinGraph Uninstall
 *
 * Uninstalling QoinGraph deletes options.
 *
 * @package qoinGraph
 * @version 1.0.0
 */

namespace QoinGraph;

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

delete_option( 'qoin_graph_settings' );
