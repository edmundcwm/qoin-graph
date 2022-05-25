( function() {
	const addCurrencyBtn = document.getElementById( 'add-new-currency' );
	const currencyTable = document.getElementById( 'currency-table' );
	const rowClone = document.getElementById( 'clone-row' );
	const tableBody = document.getElementById( 'the-list' );
	const currencyCodeEl = document.getElementById( 'currency-code' );
	const currencySymbolEl = document.getElementById( 'currency-symbol' );

	if ( ! addCurrencyBtn || ! currencyTable || ! rowClone || ! tableBody || ! currencyCodeEl || ! currencySymbolEl || undefined === qoinGraphSettings.root ) {
		return;
	}

	const endpoint = '/wp-json/qoin-graph/v1/currencies';
	const url = qoinGraphSettings.root + endpoint;

	/**
	 * Create a new row in the currency table.
	 *
	 * @return {HTMLTableRowElement} cloned table row.
	 */
	function createNewCurrencyRow() {
		const newRow = rowClone.cloneNode( true );
		newRow.removeAttribute( 'id' );
		newRow.classList.remove( 'hidden' );

		const currencyCode = newRow.querySelector( '.currency-row__code' );
		const currencySymbol = newRow.querySelector( '.currency-row__symbol' );
		const deleteBtn = newRow.querySelector( '.button.delete' );

		if ( ! currencyCode || ! currencySymbol || ! deleteBtn ) {
			return false;
		}

		currencyCode.textContent = currencyCodeEl.value.toUpperCase();
		currencySymbol.textContent = currencySymbolEl.value;
		deleteBtn.dataset.code = currencyCodeEl.value.toUpperCase();

		return newRow;
	}

	/**
	 * Handle adding of new currency.
	 */
	async function handleAddCurrency() {
		try {
			addCurrencyBtn.classList.add( 'disabled' );

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

			await response.json();

			// Add new row to the Currencies table after a successful response
			if ( response.ok ) {
				// Display table if it's currently hidden.
				currencyTable.classList.remove( 'hidden' );

				const newRow = createNewCurrencyRow();

				if ( ! newRow ) {
					throw new Error( 'Could not create new row.' );
				}

				tableBody.appendChild( newRow );

				// Clear input fields
				currencyCodeEl.value = '';
				currencySymbolEl.value = '';
			}
		} catch ( err ) {
			//TODO display error notice.
			console.error( err.message );
		} finally {
			addCurrencyBtn.classList.remove( 'disabled' );
		}
	}

	/**
	 * Handle deleting of currency.
	 *
	 * @param {Event} event
	 */
	async function handleDeleteCurrency( event ) {
		event.preventDefault();

		if ( 'BUTTON' !== event.target.tagName || ! event.target.classList.contains( 'delete' ) || event.target.classList.contains( 'disabled' ) ) {
			return;
		}

		if ( window.confirm( 'Are you sure you want to delete this currency?' ) ) { //eslint-disable-line no-alert
			try {
				event.target.classList.toggle( 'disabled' );
				const response = await fetch( url, {
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json',
						'X-WP-Nonce': qoinGraphSettings.nonce, //eslint-disable-line no-undef
					},
					body: JSON.stringify( {
						currencyCode: event.target.dataset.code,
					} ),
				} );

				await response.json();

				// Delete the row from the table after a successful response.
				if ( response.ok ) {
					const rowEl = event.target.parentElement.parentElement;
					if ( rowEl.classList.contains( 'currency-row' ) ) {
						rowEl.remove();
					}
				}
			} catch ( err ) {
				// Display error message.
				console.error( err.message );
			} finally {
				event.target.classList.toggle( 'disabled' );
			}
		}
	}

	addCurrencyBtn.addEventListener( 'click', handleAddCurrency );
	currencyTable.addEventListener( 'click', handleDeleteCurrency );
}() );
