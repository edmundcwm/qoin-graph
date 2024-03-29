/**
 * Core functionality of the Qoin Crypto Pricing Widget.
 */

( function() {
	const currencyDropdown = document.getElementById( 'currency-dropdown' );
	const frequencyToggles = document.querySelectorAll( '[data-frequency]' );
	const errorMessageEl = document.getElementById( 'qg-error' );
	const loader = document.getElementById( 'qg-loader' );
	const chart = document.getElementById( 'qg-chart' );
	const chartBodyEl = document.querySelector( '.qg-chart-wrapper' );
	const appState = {
		qoinData: {},
		qoinChart: {}, // we need to store the chart instance for each currency
		currency: currencyDropdown?.value || 'AUD',
		dataFrequency: 'all', // this needs to be a data attribute on the frequency toggle.
		error: '',
		isLoading: false,
	};

	const frequenciesObj = [
		// All time. This is a special case. We don't know what the exact number of months to go back to get all data.
		// The trick is to use a large number so the API will return data from X months ago, which is likely going to be everything.
		createFrequency( 999, 'all' ),
	];

	async function fetchData( { ...args } ) {
		try {
			const baseUrl = qoinGraphRootUrl; //eslint-disable-line no-undef
			const endpoint = '/wp-json/qoin-wp/v1/exchange-rate/' + appState.currency; // TODO should this be retrieved from Settings?
			let requestUrl = baseUrl + endpoint;
			// prepare params for date-based retrieval.
			if ( Object.keys( args ).length ) {
				const params = Object.values( args ).join( '/' );
				requestUrl += '/' + params;
			}

			const response = await fetch( requestUrl, {
				method: 'GET',
			} );

			if ( ! response.ok ) {
				throw Error( 'Error fetching data' );
			}
			return response.json();
		} catch ( err ) {
			throw err;
		}
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
		return startDate instanceof Date && ! isNaN( startDate ) ? startDate.toISOString().substring( 0, 10 ) : false;
	}

	/**
	 * Utility function to show element
	 *
	 * @param {HTMLElement} el
	 */
	function showElement( el ) {
		el.classList.remove( 'qg-hidden' );
	}

	/**
	 * Utility function to hide element
	 *
	 * @param {HTMLElement} el
	 */
	function hideElement( el ) {
		el.classList.add( 'qg-hidden' );
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
		const endDate = new Date().toISOString().substring( 0, 10 ); // this locale gives us the date in yyyy-mm-dd

		return {
			endpointParams: {
				startDate,
				endDate,
				frequency,
			},
			id,
		};
	}

	/**
	 * Handles storing of data into local storage.
	 *
	 * @param {Object} data API response.
	 */
	function cacheData( data = {} ) {
		if ( ! Object.keys( data ).length ) {
			return;
		}

		localStorage.setItem( 'qoinCurrencies', JSON.stringify( data ) );
	}

	/**
	 * Handles storing of data expiration time in local storage.
	 * This is used to determine whether to re-fetch data from API.
	 *
	 * @param {number} ttl Time to live.
	 */
	function setWithExpiry( ttl = 0 ) {
		const now = new Date().getTime();

		localStorage.setItem( 'qoinCurrencies_expiry', now + ttl );
	}

	/**
	 * Check whether data in local storage has expired.
	 */
	function hasDataExpired() {
		const expiry = localStorage.getItem( 'qoinCurrencies_expiry' );
		const now = new Date().getTime();

		if ( null === expiry || now >= expiry ) {
			return true;
		}

		return false;
	}

	function maybeFetchResources() {
		appState.error = '';
		const { qoinData, currency } = appState;
		if ( qoinData && currency in qoinData && ! hasDataExpired() ) {
			// Cache is still valid. Don't fetch from API.
			render();
			return;
		}

		fetchAllResources();
	}

	// Handles fetching from all API endpoints.
	async function fetchAllResources() {
		if ( hasDataExpired() ) {
			// Reset state.
			appState.qoinData = {};
		}

		const { qoinData, currency } = appState;

		try {
			appState.isLoading = true;
			appState.error = '';

			render();

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

				// Historic values do not give us the current Qoin Price. So we need to append current price to the end of historic values.
				const currentPrice = {
					valuationDate: new Date().toISOString(),
					currencyRate: formatPrice( response.current.price ),
				};

				response.historic.push( currentPrice );

				// Update App state.
				qoinData[ currency ] = { ...qoinData[ currency ], [ frequencyId ]: response.historic };
			} );

			//TODO should not cache empty object.

			cacheData( qoinData );

			// When fetching new currency we do not want to reset the current cache expiry time.
			// It should only be set if the cache does not exist or if it has already expired.
			if ( ! localStorage.getItem( 'qoinCurrencies_expiry' ) || hasDataExpired() ) {
			// Set a 1 hour expiration for the data in local storage.
				setWithExpiry( 60 * 60 * 1000 );
			}
		} catch ( err ) {
			appState.error = err.message;
		} finally {
			appState.isLoading = false;

			render();
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
		return price.toFixed( 3 );
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
			// All these properties are not in used.
			delete value.currencyFrom;
			delete value.exchangeRate;
			delete value.rangeDate;
			delete value.rateDate;
			delete value.tokenValue;

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
		// hide error
		hideElement( errorMessageEl );
		hideElement( loader );

		if ( 'function' !== typeof Chart ) {
			return;
		}

		const dataSet = [];
		const labels = [];
		const { dataFrequency, qoinData, currency } = appState;

		if ( ! Object.keys( qoinData ).length ) {
			return;
		}

		chartBodyEl.classList.remove( 'qg-hidden' );

		// Chart options.
		const options = {
			maintainAspectRatio: false,
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
						maxTicksLimit: window.matchMedia( '(max-width: 767px)' ).matches ? 5 : 10, // Show 5 labels on Mobile and 10 on Desktop.
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

		if ( ! availableData ) {
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
			const localeDate = date.toLocaleString( 'default', { year: '2-digit', month: 'short', day: 'numeric' } );
			const dateElementsArr = localeDate.split( ' ' );
			const formattedDate = [ dateElementsArr[ 0 ] + ' ' + dateElementsArr[ 1 ], dateElementsArr[ 2 ] ]; // Results in a line break i.e., 3 May <br> 22.

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

	/**
	 * Render loading state.
	 */
	function renderLoading() {
		showElement( loader );
		hideElement( chartBodyEl );
		hideElement( errorMessageEl );
	}

	/**
	 * Render error state.
	 */
	function renderError() {
		errorMessageEl.textContent = appState.error;
		showElement( errorMessageEl );
		hideElement( loader );
		hideElement( chartBodyEl );
	}

	function render() {
		if ( appState.isLoading ) {
			// Loading state.
			renderLoading();
			return;
		}
		if ( appState.error ) {
			// Error state.
			renderError();
			return;
		}

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

			maybeFetchResources();
		} );
	}

	/**
	 * Update state based on cached values.
	 */
	function primeStateFromCache() {
		const dataFromCache = JSON.parse( localStorage.getItem( 'qoinCurrencies' ) ) || {};
		appState.qoinData = dataFromCache;
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
		primeStateFromCache();
		registerEvents();
		maybeFetchResources();
	}

	init();
}() );
