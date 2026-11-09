import type { IDisplayOptions, INodeProperties } from 'n8n-workflow';

/**
 * Fields that choose a group of stores: a source (all, revealed, a signal set or a watchlist)
 * and column filters. Used by Store > Search and by every operation that takes a "selection".
 */
export function storeSourceFields(displayOptions: IDisplayOptions): INodeProperties[] {
	const show = displayOptions.show ?? {};
	return [
		{
			displayName: 'Source',
			name: 'source',
			type: 'options',
			default: 'all',
			displayOptions,
			options: [
				{
					name: 'All Stores',
					value: 'all',
					description: 'The full store catalog',
				},
				{
					name: 'Revealed Stores',
					value: 'revealed',
					description: 'Only the stores that you revealed',
				},
				{
					name: 'Signal Set',
					value: 'signalSet',
					description: 'The leads of one of your signal sets (paid plans)',
				},
				{
					name: 'Watchlist',
					value: 'watchlist',
					description: 'The stores on one of your watchlists (paid plans)',
				},
			],
			description: 'Which stores to use',
		},
		{
			displayName: 'Signal Set Name or ID',
			name: 'signalSetId',
			type: 'options',
			typeOptions: { loadOptionsMethod: 'getSignalSets' },
			required: true,
			default: '',
			displayOptions: { show: { ...show, source: ['signalSet'] } },
			description:
				'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		},
		{
			displayName: 'Watchlist Name or ID',
			name: 'watchlistId',
			type: 'options',
			typeOptions: { loadOptionsMethod: 'getWatchlists' },
			required: true,
			default: '',
			displayOptions: { show: { ...show, source: ['watchlist'] } },
			description:
				'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		},
		{
			displayName: 'Filters',
			name: 'filters',
			type: 'fixedCollection',
			placeholder: 'Add Filter',
			typeOptions: { multipleValues: true },
			default: {},
			displayOptions,
			description: 'Column filters. All filters must match.',
			options: [
				{
					displayName: 'Filter',
					name: 'filter',
					values: [
						{
							displayName: 'Column Name or ID',
							name: 'column',
							type: 'options',
							typeOptions: { loadOptionsMethod: 'getStoreColumns' },
							default: '',
							description:
								'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						},
						{
							displayName: 'Operator',
							name: 'operator',
							type: 'options',
							default: 'contains',
							options: [
								{ name: 'Contains', value: 'contains', description: 'Text columns' },
								{ name: 'Does Not Contain', value: 'notContains', description: 'Text columns' },
								{ name: 'Does Not Exist', value: 'notExists' },
								{ name: 'Equals', value: 'eq', description: 'Number columns' },
								{ name: 'Exists', value: 'exists' },
								{ name: 'Greater Than', value: 'gt', description: 'Number columns' },
								{
									name: 'Greater Than or Equal',
									value: 'gte',
									description: 'Number columns',
								},
								{ name: 'Has Any', value: 'hasAny', description: 'Tag columns' },
								{ name: 'Has None', value: 'notHas', description: 'Tag columns' },
								{ name: 'Is', value: 'is', description: 'Text and date columns' },
								{
									name: 'Is After',
									value: 'isAfter',
									description: 'Date columns. Value: YYYY-MM-DD.',
								},
								{
									name: 'Is Before',
									value: 'isBefore',
									description: 'Date columns. Value: YYYY-MM-DD.',
								},
								{ name: 'Is Empty', value: 'isEmpty' },
								{ name: 'Is Not', value: 'isNot', description: 'Text columns' },
								{ name: 'Is Not Empty', value: 'isNotEmpty' },
								{
									name: 'Is Within Last',
									value: 'isWithinLast',
									description: 'Date columns. Value: a number of days.',
								},
								{ name: 'Less Than', value: 'lt', description: 'Number columns' },
								{
									name: 'Less Than or Equal',
									value: 'lte',
									description: 'Number columns',
								},
							],
						},
						{
							displayName: 'Value',
							name: 'value',
							type: 'string',
							default: '',
							displayOptions: {
								hide: { operator: ['isEmpty', 'isNotEmpty', 'exists', 'notExists'] },
							},
							description:
								'The value to compare. A number for number columns, YYYY-MM-DD for Is Before and Is After, a number of days for Is Within Last.',
						},
					],
				},
			],
		},
	];
}

/** The "selection" fields: either a list of store IDs, or a source with filters. */
export function selectionFields(displayOptions: IDisplayOptions): INodeProperties[] {
	const show = displayOptions.show ?? {};
	const tabDisplay: IDisplayOptions = { show: { ...show, selectBy: ['source'] } };
	return [
		{
			displayName: 'Select Stores By',
			name: 'selectBy',
			type: 'options',
			default: 'ids',
			displayOptions,
			options: [
				{
					name: 'Store IDs',
					value: 'ids',
					description: 'A list of store IDs (the storeId field of a search result)',
				},
				{
					name: 'Source and Filters',
					value: 'source',
					description: 'All stores of a source that match the filters',
				},
			],
		},
		{
			displayName: 'Store IDs',
			name: 'storeIds',
			type: 'string',
			required: true,
			default: '',
			placeholder: '123, 456',
			displayOptions: { show: { ...show, selectBy: ['ids'] } },
			description: 'Store IDs, separated by commas',
		},
		...storeSourceFields(tabDisplay),
		{
			displayName: 'Exclude Store IDs',
			name: 'deselected',
			type: 'string',
			default: '',
			placeholder: '123, 456',
			displayOptions: tabDisplay,
			description: 'Store IDs to leave out of the selection, separated by commas',
		},
	];
}
