( function() {
	const addCurrencyBtn = document.getElementById( 'add-new-currency' );
	const currencyTable = document.getElementById( 'currency-table' );
	const rowClone = document.getElementById( 'clone-row' );
	const tableBody = document.getElementById( 'the-list' );
	const currencyCodeEl = document.getElementById( 'currency-code' );
	const currencySymbolEl = document.getElementById( 'currency-symbol' );

	if ( ! addCurrencyBtn || ! currencyTable || ! rowClone || ! tableBody || ! currencyCodeEl || ! currencySymbolEl || undefined === qoinGraphSettings.root ) { // eslint-disable-line no-undef
		return;
	}

	const noticeWrapper = document.getElementById( 'new-currency-notice' );
	const messageEl = noticeWrapper.querySelector( '.notice-message' );

	const formInputs = {
		currencyCode: currencyCodeEl,
		currencySymbol: currencySymbolEl,
	};

	const currencyTableObj = {
		el: currencyTable,
		handleEvents() {
			this.el.addEventListener( 'click', handleDeleteCurrency );
		},
		hasRows() {
			return this.el.querySelectorAll( '.currency-row:not(.hidden)' ).length;
		},
		hide() {
			this.el.classList.add( 'hidden' );
		},
		show() {
			this.el.classList.remove( 'hidden' );
		},
	};

	const endpoint = '/wp-json/qoin-graph/v1/currencies';
	const url = qoinGraphSettings.root + endpoint; //eslint-disable-line no-undef

	/**
	 * Show notice.
	 *
	 * @param {string} message
	 * @param {string} type
	 */
	function showNotice( message, type = 'success' ) {
		if ( messageEl ) {
			noticeWrapper.classList.add( 'notice-' + type );
			noticeWrapper.classList.remove( 'hidden' );
			messageEl.textContent = message;
		}
	}

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
	 * Basic validation that checks for empty inputs.
	 *
	 * @return {boolean}} validation result.
	 */
	function validateInputs() {
		for ( const input in formInputs ) {
			if ( ! formInputs[ input ].value ) {
				formInputs[ input ].focus();
				return false;
			}
		}

		return true;
	}

	/**
	 * Handle adding of new currency.
	 */
	async function handleAddCurrency() {
		if ( addCurrencyBtn.classList.contains( 'disabled' ) ) {
			return;
		}

		const validate = validateInputs();

		if ( ! validate ) {
			return;
		}

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
				const newRow = createNewCurrencyRow();

				if ( ! newRow ) {
					throw new Error( 'Could not create new row.' );
				}

				tableBody.appendChild( newRow );

				// Display currency table.
				if ( currencyTableObj.hasRows() ) {
					currencyTableObj.show();
				}

				// Clear input fields
				currencyCodeEl.value = '';
				currencySymbolEl.value = '';

				showNotice( 'Currency added successfully.' );
			} else {
				throw new Error( 'An error has occurred. Unable to add currency.' );
			}
		} catch ( err ) {
			showNotice( err.message, 'error' );
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
				event.target.classList.add( 'disabled' );
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

					// Hide currency table if there are no more currencies.
					if ( ! currencyTableObj.hasRows() ) {
						currencyTableObj.hide();
					}

					showNotice( 'Currency deleted successfully.' );
				} else {
					throw new Error( 'An error has occurred. Unable to delete currency.' );
				}
			} catch ( err ) {
				showNotice( err.message, 'error' );
			} finally {
				event.target.classList.remove( 'disabled' );
			}
		}
	}

	addCurrencyBtn.addEventListener( 'click', handleAddCurrency );
	currencyTableObj.handleEvents();
}() );
