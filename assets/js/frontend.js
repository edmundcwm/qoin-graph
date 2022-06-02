/**
 * Core functionality of the Qoin Crypto Pricing Widget.
 */

( function() {
	const currencyDropdown = document.getElementById( 'currency-dropdown' );
	const frequencyToggles = document.querySelectorAll( '[data-frequency]' );
	const loader = document.getElementById( 'qg-loader' );
	const chart = document.getElementById( 'qg-chart' );
	const appState = {
		qoinData: {},
		qoinChart: {}, // we need to store the chart instance for each currency
		currency: currencyDropdown?.value || 'AUD',
		dataFrequency: '1M', // this needs to be a data attribute on the frequency toggle.
		errors: {},
	};

	const baseUrl = 'https://stagingshop.qoin.world/'; //! temporary for now. Will need to use current site url

	const frequenciesObj = [
		createFrequency( 1, '1M' ), // One Month
		createFrequency( 3, '3M' ), // Three Month
		createFrequency( 6, '6M' ), // Six Month
		// All time. This is a special case. We don't know what the exact number of months to go back to get all data.
		// The trick is to use a large number so the API will return data from X months ago, which is likely going to be everything.
		createFrequency( 999, 'all' ),
	];

	function fetchData( { ...args } ) {
		const endpoint = 'wp-json/qoin-wp/v1/exchange-rate/' + appState.currency; // TODO should this be retrieved from Settings?
		let requestUrl = baseUrl + endpoint;
		// prepare params for date-based retrieval.
		if ( Object.keys( args ).length ) {
			const params = Object.values( args ).join( '/' );
			requestUrl += '/' + params;
		}

		return fetch( requestUrl, {
			method: 'GET',
		} ).then( ( res ) => res.json() );
	}

	/**
	 * Utility function to retrieve a date based on X number of months before the current date.
	 *
	 * @param {number} numOfMonthsPrior - number of months before the current date.
	 * @return {string|boolean} Start date in yyyy-mm-dd format or false if error.
	 */
	function getStartDate( numOfMonthsPrior ) {
		const startDate = new Date();
		const month = startDate.getMonth() - parseInt( numOfMonthsPrior );

		startDate.setMonth( month );

		// Ensure startDate is a valid date before formatting it.
		return startDate instanceof Date && ! isNaN( startDate ) ? startDate.toLocaleDateString( 'en-CA' ) : false;
	}

	function showLoader() {
		loader.classList.remove( 'hidden' );
		chart.classList.add( 'inactive' );
	}

	function hideLoader() {
		loader.classList.add( 'hidden' );
		chart.classList.remove( 'inactive' );
	}

	/**
	 * Factory function for creating a frequency object
	 *
	 * @param {number} numberOfMonths
	 * @param {number} id
	 * @return  {Object} Frequency object
	 */
	function createFrequency( numberOfMonths, id ) {
		const startDate = getStartDate( numberOfMonths );

		if ( ! startDate ) {
			// TODO: Should we remove the frequency toggle if we can't get a start date?
			return false;
		}

		const frequency = 'day';
		const endDate = new Date().toLocaleDateString( 'en-CA' ); // this locale gives us the date in yyyy-mm-dd

		return {
			endpointParams: {
				startDate,
				endDate,
				frequency,
			},
			id,
		};
	}

	// Handles fetching from all API endpoints.
	async function fetchAllResources() {
		const { qoinData, currency } = appState;
		try {
			showLoader();

			// Remove frequencies that are invalid then fetch data.
			const fetchAllData = frequenciesObj.filter( Boolean ).map( function( frequencyParam ) {
				return fetchData( frequencyParam.endpointParams );
			} );

			const responses = await Promise.all( fetchAllData );

			const formattedResponses = responses.map( function( response ) {
				return formatResponse( response );
			} );

			formattedResponses.forEach( ( response, index ) => {
				const frequencyId = frequenciesObj[ index ].id;
				// Update App state.
				qoinData[ currency ] = { ...qoinData[ currency ], [ frequencyId ]: response.historic };
			} );

			render();
		} catch ( err ) {
			console.log( err );
		} finally {
			hideLoader();
		}
	}

	/**
	 * Utility function for formatting response based on specific formatters.
	 *
	 * @param {Object} res
	 * @return {Object} Formatted response
	 */
	function formatResponse( res = {} ) {
		if ( ! Object.keys( res ).length ) {
			return false;
		}

		const newRes = {};

		const formatter = {
			historic: formatHistoricalData,
		};

		Object.keys( res ).forEach( function( key ) {
			if ( key in formatter ) {
				newRes[ key ] = formatter[ key ]( res[ key ] );
			}
		} );

		return { ...res, ...newRes };
	}

	/**
	 * Format historical data to desired format.
	 *
	 * @param {Array} historical
	 * @return {Array} modified historical data.
	 */
	function formatHistoricalData( historical ) {
		if ( ! Array.isArray( historical ) ) {
			return historical;
		}

		// Remove first item from historical data.
		historical.shift();

		historical = historical.map( function( value ) {
			value.currencyRate = value.currencyRate.toFixed( 3 ); // format values to three decimal place.
			return value;
		} );

		return historical;
	}

	/**
	 * Render toggle's active/inactive state.
	 */
	function renderToggleState() {
		if ( ! frequencyToggles ) {
			return;
		}

		frequencyToggles.forEach( function( toggle ) {
			if ( appState.dataFrequency === toggle.dataset.frequency ) {
				toggle.classList.add( 'active' );
			} else {
				toggle.classList.remove( 'active' );
			}
		} );
	}

	/**
	 * Render Chart.
	 */
	function renderChart() {
		if ( 'function' !== typeof Chart ) {
			return;
		}

		const dataSet = [];
		const labels = [];
		const { dataFrequency, qoinData, currency } = appState;

		if ( ! Object.keys( qoinData ).length ) {
			return;
		}

		// Chart options.
		const options = {
			plugins: {
				legend: {
					display: false,
				},
				tooltip: {
					mode: 'index',
					intersect: false,
					displayColors: false,
					callbacks: {
						label( tooltipItem ) {
							const currencySymbol = 'undefined' !== qoinGraphCurrencies && qoinGraphCurrencies[ currency ] ? qoinGraphCurrencies[ currency ] : '$'; //eslint-disable-line no-undef
							// Display price in the tooltip.
							return currencySymbol + Number( tooltipItem.formattedValue ); // TODO refactor this. CHeck if qoinGraphCurrencies exist
						},
					},
				},
			},
			elements: {
				point: {
					radius: 0,
				},
			},
			scales: {
				x: {
					ticks: {
						maxTicksLimit: 10, // number of labels on the x-axis
						maxRotation: 0,
					},
				},
				y: {
					title: {
						display: true,
						text: 'Qoin Value in ' + currency,
					},
					ticks: {
						precision: 2,
					},
				},
			},
		};

		const availableData = qoinData?.[ currency ]?.[ dataFrequency ];

		if ( undefined === availableData ) {
			return;
		}
		// Retrieve historical data from state and use them as datasets.
		availableData.forEach( function( data ) {
			dataSet.push( data.currencyRate );

			// Retrieve date from ISOString format and use it as label.
			const date = new Date( data.valuationDate.split( 'T' )[ 0 ] );
			if ( ! ( date instanceof Date ) || isNaN( date ) ) {
				// Should display error here?
				return;
			}
			// Format to use for date - 30 Apr 22.
			const formattedDate = date.toLocaleString( 'default', { year: '2-digit', month: 'short', day: 'numeric' } );

			labels.push( formattedDate );
		} );

		// Update chart with new data if Chart has already been drawn.
		if ( appState.qoinChart instanceof Chart ) { // eslint-disable-line no-undef
			appState.qoinChart.data.datasets[ 0 ].data = dataSet;
			appState.qoinChart.data.labels = labels;
			appState.qoinChart.options = options;

			appState.qoinChart.update();
			return;
		}

		// Initialise Chart.
		appState.qoinChart = new Chart( chart, { //eslint-disable-line no-undef
			type: 'line',
			data: {
				labels,
				datasets: [ {
					data: dataSet,
					borderColor: '#197a83',
					lineTension: 0.4,
					borderWidth: 2,
					pointBackgroundColor: '#197a83',
				} ],
			},
			options,
		} );
	}

	function render() {
		renderToggleState();
		renderChart();
	}

	// Event handler for frequency toggle.
	function handleFrequencyToggle() {
		if ( ! frequencyToggles ) {
			return;
		}

		frequencyToggles.forEach( function( toggle ) {
			// Set active toggle based on default frequency on initial load.
			renderToggleState();

			toggle.addEventListener( 'click', function( e ) {
				e.preventDefault();
				// Update dataFrequency state.
				appState.dataFrequency = this.dataset.frequency;

				render();
			} );
		} );
	}

	function handleCurrencyChange() {
		currencyDropdown.addEventListener( 'change', function() {
			appState.currency = this.value;

			fetchAllResources();
		} );
	}

	/**
	 * Register all event handlers.
	 */
	function registerEvents() {
		handleFrequencyToggle();
		handleCurrencyChange();
	}

	/**
	 * Initialise widget.
	 */
	function init() {
		registerEvents();
		fetchAllResources();
	}

	init();
}() );
