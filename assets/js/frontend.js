/**
 * Core functionality of the Qoin Crypto Pricing Widget.
 */

/**
 * TODO:
 * - Loader state
 * - Cache value
 */
( function() {
	const currencyDropdown = document.getElementById( 'currency-dropdown' );
	const loader = document.getElementById( 'loader' );
	const appState = {
		qoinData: {},
		qoinChart: {}, // we need to store the chart instance for each currency
		currency: currencyDropdown?.value || 'AUD',
		dataFrequency: 'month', // this needs to be a data attribute on the frequency toggle.
		errors: {},
	};

	const baseUrl = 'https://stagingshop.qoin.world/'; //! temporary for now. Will need to use current site url

	async function getPrice( { ...args } ) {
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
	 * Utility function to retrieve start date based on frequency.
	 *
	 * @param {string} frequency
	 * @return {string} Start date in yyyy-mm-dd format
	 */
	function getStartDate( frequency = 'day' ) {
		let startDate = '';
		switch ( frequency ) {
			case 'hour':
				startDate = new Date();
				startDate.setDate( startDate.getDate() - 1 );
				break;

			case 'day':
				startDate = new Date();
				startDate.setDate( startDate.getDate() - 7 );
				break;

			case 'month':
				startDate = new Date();
				startDate.setMonth( startDate.getMonth() - 1 );
				break;
		}
		return startDate.toLocaleDateString( 'en-CA' );
	}

	function showLoader() {
		loader.classList.remove( 'hidden' );
	}

	function hideLoader() {
		loader.classList.add( 'hidden' );
	}

	// Handles fetching from all API endpoints.
	async function fetchAllResources() {
		const { qoinData, currency } = appState;
		const endDate = new Date().toLocaleDateString( 'en-CA' ); // this locale gives us the date in yyyy-mm-dd format.
		const historicDayParams = { startDate: getStartDate( 'day' ), endDate, frequency: 'day' };
		const historicHourParams = { startDate: getStartDate( 'hour' ), endDate, frequency: 'hour' };
		const historicMonthParams = { startDate: getStartDate( 'month' ), endDate, frequency: 'day' };
		// Fetch from both historic endpoints concurrently.
		const fetchHistoricDay = getPrice( historicDayParams );
		const fetchHistoricHour = getPrice( historicHourParams );
		const fetchHistoricMonth = getPrice( historicMonthParams );

		try {
			showLoader();

			// Wait for all endpoints to resolve.
			const [ dayResponse, hourResponse, monthResponse ] = await Promise.all( [ fetchHistoricDay, fetchHistoricHour, fetchHistoricMonth ] );

			//  We only need the historic property for both Hourly and Monthly data.
			const historicHourResponse = Object.assign( {}, hourResponse );
			const historicMonthResponse = Object.assign( {}, monthResponse );
			delete historicHourResponse.current;
			delete historicMonthResponse.current;

			// Format responses.
			const formattedDayResp = formatResponse( dayResponse );
			const formattedHourResp = formatResponse( historicHourResponse );
			const formattedMonthResp = formatResponse( historicMonthResponse );

			// Prepare data for storing in local storage.
			const dataToCache = {
				current: formattedDayResp.current,
				day: formattedDayResp.historic,
				hour: formattedHourResp.historic,
				month: formattedMonthResp.historic,
			};

			// Update App state.
			Object.keys( dataToCache ).forEach( function( key ) {
				qoinData[ currency ] = { ...qoinData[ currency ], [ key ]: dataToCache[ key ] };
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
			current: formatCurrentData,
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
	 * Format current data to desired format.
	 *
	 * @param {Object} current
	 * @return {Object} modified current data.
	 */
	function formatCurrentData( current ) {
		const { price } = current;
		const percentageChange = current[ '24h' ]; // This property name makes it tricky to destructure.
		const data = {
			currentPrice: {
				hasError: false,
				formatter: formatPrice,
				value: price,
			},
			percentageChange: {
				hasError: false,
				formatter: formatPercentageChange,
				value: percentageChange,
			},
		};

		const formattedData = {
			currentPrice: null,
			percentageChange: null,
		};

		if ( isNaN( parseFloat( price ) ) ) {
			appState.errors.currentPrice = 'Unable to retrieve current price. Please refresh.';
			data.currentPrice.hasError = true;
		}

		if ( isNaN( parseFloat( percentageChange ) ) ) {
			appState.errors.percentageChange = 'Unable to retrieve percentage change. Please refresh.';
			data.percentageChange.hasError = true;
		}

		for ( const key in data ) {
			// No errors. Proceed to format value.
			if ( ! data[ key ].hasError ) {
				formattedData[ key ] = data[ key ].formatter( data[ key ].value );

				delete appState.errors[ key ];
			}
		}

		return { ...current, price: formattedData.currentPrice, '24h': formattedData.percentageChange };
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
			value.currencyRate = value.currencyRate.toFixed( 3 );
			return value;
		} );

		return historical;
	}

	/**
	 * A utility function to convert a value to 2 decimal places.
	 *
	 * @param {string} price
	 * @return {number} formatted price
	 */
	function formatPrice( price ) {
		if ( typeof price !== 'number' ) {
			price = parseInt( price );
		}

		// A few things to do here:
		// 1. Convert number to a float if necessary.
		if ( Number.isInteger( price ) ) {
			price = price / 1000000000000000000;
		}
		// 2. Convert float to two decimal places.
		const formattedPrice = price.toFixed( 2 );

		return formattedPrice;
	}

	function formatPercentageChange( value ) {
		const formattedPercentageChange = Math.abs( value );
		return formattedPercentageChange;
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

		const ctx = document.getElementById( 'qcpw-chart' );
		ctx.classList.add( 'active' );

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
							// Display price in the tooltip.
							return '$' + Number( tooltipItem.formattedValue );
						},
					},
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

		// Retrieve historical data from state and use them as datasets.
		qoinData[ currency ][ dataFrequency ].forEach( function( data ) {
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
		appState.qoinChart = new Chart( ctx, { //eslint-disable-line no-undef
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
		renderChart();
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
