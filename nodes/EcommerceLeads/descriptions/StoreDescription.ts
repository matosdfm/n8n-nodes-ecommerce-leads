import type { INodeProperties } from 'n8n-workflow';
import { selectionFields, storeSourceFields } from './SharedFields';

const CHART_METRICS = [
	'Est. Monthly Revenue (USD)',
	'Total Traffic',
	'Organic Traffic',
	'Google Paid Traffic',
	'Paid Social Traffic',
	'Organic Social Traffic',
	'Backlinks',
	'Referring Domains',
	'Page Speed Performance Score',
	'Page Speed SEO Score',
	'Estimated Google Ad Spend',
	'Estimated Meta Ad Spend',
	'Total Meta Ads',
	'Active Meta Ads',
	'Number of Video Ads',
	'Total Instagram Followers',
	'Total Instagram Posts',
	'Instagram Engagement Rate',
	'Average Instagram Likes',
	'Average Instagram Comments',
	'Average Instagram Posts per Week',
	'Total Tiktok Followers',
	'Total Tiktok Uploads',
	'Average Tiktok Uploads per Week',
];

export const storeOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['store'] } },
		options: [
			{
				name: 'Export',
				value: 'export',
				description: 'Export revealed stores as a CSV file or as items',
				action: 'Export stores',
			},
			{
				name: 'Get Metric History',
				value: 'getChart',
				description: 'Get the latest 24 data points of one metric for a store',
				action: 'Get the metric history of a store',
			},
			{
				name: 'Look Up',
				value: 'lookup',
				description:
					'Get revenue, traffic, ad spend and buying signals for one domain or email. Costs no credits.',
				action: 'Look up a store',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search the store catalog with filters',
				action: 'Search stores',
			},
			{
				name: 'Update Outreach Status',
				value: 'updateOutreachStatus',
				description: 'Set your outreach status for a revealed store',
				action: 'Update the outreach status of a store',
			},
		],
		default: 'lookup',
	},
];

export const storeFields: INodeProperties[] = [
	// ----------------------------------------
	//             store: lookup
	// ----------------------------------------
	{
		displayName: 'Domain or Email',
		name: 'domain',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'example.com',
		displayOptions: { show: { resource: ['store'], operation: ['lookup', 'getChart'] } },
		description:
			'A store domain, a URL or an email address. For an email, the node uses the part after the @. Free email domains such as gmail.com return found: false without an API call.',
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		displayOptions: { show: { resource: ['store'], operation: ['lookup'] } },
		description:
			'Whether to return the store fields at the top level of the item instead of the raw API response',
	},

	// ----------------------------------------
	//             store: getChart
	// ----------------------------------------
	{
		displayName: 'Metric',
		name: 'metric',
		type: 'options',
		default: 'Est. Monthly Revenue (USD)',
		displayOptions: { show: { resource: ['store'], operation: ['getChart'] } },
		options: CHART_METRICS.map((metric) => ({ name: metric, value: metric })),
		description: 'The metric to return. Money values use the currency of your account.',
	},

	// ----------------------------------------
	//             store: search
	// ----------------------------------------
	...storeSourceFields({ show: { resource: ['store'], operation: ['search'] } }),
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['store'], operation: ['search'] } },
		description: 'Whether to return all results or only up to a given limit',
		hint: 'The API returns 30 stores for each request. For All Stores, add filters before you turn this on.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: { show: { resource: ['store'], operation: ['search'], returnAll: [false] } },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['store'], operation: ['search'] } },
		options: [
			{
				displayName: 'All Columns',
				name: 'allColumns',
				type: 'boolean',
				default: false,
				description:
					'Whether to return every column and the full reveal object. This overrides Columns.',
			},
			{
				displayName: 'Column Names or IDs',
				name: 'columns',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getStoreColumns' },
				default: [],
				description:
					'The columns to return for each store. Leave empty for the default columns. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Sort Column Name or ID',
				name: 'sortColumn',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getStoreColumns' },
				default: '',
				description:
					'The column to sort by. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Sort Direction',
				name: 'sortDirection',
				type: 'options',
				default: 'desc',
				options: [
					{ name: 'Ascending', value: 'asc' },
					{ name: 'Descending', value: 'desc' },
				],
			},
		],
	},

	// ----------------------------------------
	//             store: export
	// ----------------------------------------
	...selectionFields({ show: { resource: ['store'], operation: ['export'] } }),
	{
		displayName: 'Format',
		name: 'format',
		type: 'options',
		default: 'csv',
		displayOptions: { show: { resource: ['store'], operation: ['export'] } },
		options: [
			{
				name: 'CSV File',
				value: 'csv',
				description: 'One item with the CSV file in a binary field',
			},
			{
				name: 'Items',
				value: 'json',
				description: 'One item for each exported store',
			},
		],
		description: 'Only stores that you revealed are exported. Export costs no credits.',
	},
	{
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		displayOptions: { show: { resource: ['store'], operation: ['export'], format: ['csv'] } },
		hint: 'The name of the output binary field to put the file in',
	},
	{
		displayName: 'Column Names or IDs',
		name: 'visibleColumns',
		type: 'multiOptions',
		typeOptions: { loadOptionsMethod: 'getStoreColumns' },
		default: [],
		displayOptions: { show: { resource: ['store'], operation: ['export'] } },
		description:
			'The columns to export. Leave empty to export every column. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	// ----------------------------------------
	//        store: updateOutreachStatus
	// ----------------------------------------
	{
		displayName: 'Store ID',
		name: 'storeId',
		type: 'number',
		typeOptions: { minValue: 1 },
		required: true,
		default: 0,
		displayOptions: { show: { resource: ['store'], operation: ['updateOutreachStatus'] } },
		description:
			'The store ID (the storeId field of a search result). You must reveal the store first.',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		default: 'Contacted',
		displayOptions: { show: { resource: ['store'], operation: ['updateOutreachStatus'] } },
		options: [
			{ name: 'Blacklisted', value: 'Blacklisted' },
			{ name: 'Contacted', value: 'Contacted' },
			{ name: 'Interested', value: 'Interested' },
			{ name: 'Not Contacted', value: 'Not Contacted', description: 'Clears the status' },
			{ name: 'Not Interested', value: 'Not Interested' },
			{ name: 'Won', value: 'Won' },
		],
		description: 'The status is private to your account',
	},
];
