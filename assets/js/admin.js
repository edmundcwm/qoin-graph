(function() {

    const addCurrencyBtn = document.getElementById('add-new-currency');
	const currencyTable = document.getElementById('currency-table');
	const rowClone = document.getElementById('clone-row');
	const tableBody = document.getElementById('the-list');
	const currencyCodeEl = document.getElementById('currency-code');
	const currencySymbolEl = document.getElementById('currency-symbol');
	
    if ( ! addCurrencyBtn || ! currencyTable ) {
        return;
    }

	function createNewCurrencyRow() {
		const newRow = rowClone.cloneNode(true)
		newRow.removeAttribute('id');
		newRow.classList.remove('hidden');

		const currencyCode = newRow.querySelector('.currency-row__code');
		const currencySymbol = newRow.querySelector('.currency-row__symbol2');

		if ( ! currencyCode || ! currencySymbol ) {
			return false;
		}

		currencyCode.textContent = currencyCodeEl.value.toUpperCase();
		currencySymbol.textContent = currencySymbolEl.value;

		return newRow;
	}

    async function handleAddCurrency() {
        const endpoint = '/wp-json/qoin-graph/v1/currencies';
		const url = qoinGraphSettings.root + endpoint; //eslint-disable-line no-undef

		try {
			const response = await fetch( url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-WP-Nonce': qoinGraphSettings.nonce, //eslint-disable-line no-undef
				},
				body: JSON.stringify( {
					currencyCode: currencyCodeEl.value.toUpperCase(),
					currencySymbol: currencySymbolEl.value,
				} ),
			} );
	
			const result = await response.json();
	
			// Add new row to the Currencies table after a successful response
			if ( response.ok ) {
				// Display table if it's currently hidden.
				currencyTable.classList.remove('hidden');
				
				const newRow = createNewCurrencyRow();
	
				if ( ! newRow ) {
					throw new Error('Could not create new row.');
				}
				
				// Clear input fields
				currencyCodeEl.value = '';
				currencySymbolEl.value = '';
	
				return result;
			}
		} catch (err) {
			console.error(err.message);
		// 	const noticeWrapper = document.getElementById( 'new-currency-notice');
		// 	noticeWrapper.classList.remove('hidden');

		// 	const noticeMessageEl = document.querySelector( '#new-currency-notice .notice-message' );
		// 	noticeMessageEl.textContent = err.message;
		}
	
    }

    addCurrencyBtn.addEventListener( 'click', handleAddCurrency );

	//TODO Delete currency

})();