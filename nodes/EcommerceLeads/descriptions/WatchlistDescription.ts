import type { INodeProperties } from 'n8n-workflow';

export const watchlistOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['watchlist'] } },
		options: [
			{
				name: 'Add Domains',
				value: 'addDomains',
				description:
					'Add domains to a watchlist. Each new domain costs 1 credit. The blacklist costs 0.',
				action: 'Add domains to a watchlist',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create an empty watchlist',
				action: 'Create a watchlist',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a watchlist and all its domains. This cannot be undone.',
				action: 'Delete a watchlist',
			},
			{
				name: 'Get Domains',
				value: 'getDomains',
				description: 'Get the domains of a watchlist or of the blacklist',
				action: 'Get the domains of a watchlist',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get your watchlists and your blacklist',
				action: 'Get many watchlists',
			},
			{
				name: 'Remove Domain',
				value: 'removeDomain',
				description: 'Remove one domain from a watchlist or from the blacklist',
				action: 'Remove a domain from a watchlist',
			},
			{
				name: 'Rename',
				value: 'rename',
				description: 'Change the name of a watchlist',
				action: 'Rename a watchlist',
			},
		],
		default: 'getAll',
	},
];

export const watchlistFields: INodeProperties[] = [
	{
		displayName: 'Watchlist Name or ID',
		name: 'listId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getWatchlists' },
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['watchlist'],
				operation: ['addDomains', 'delete', 'getDomains', 'removeDomain', 'rename'],
			},
		},
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['watchlist'], operation: ['create', 'rename'] } },
		description: 'The list name. At most 100 characters.',
	},
	{
		displayName: 'Domains',
		name: 'domains',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'example.com, shop.example.org',
		displayOptions: { show: { resource: ['watchlist'], operation: ['addDomains'] } },
		description:
			'Domains, URLs or emails, separated by commas or new lines. The node sends them in groups of 50. Domains already on the list cost 0 credits.',
	},
	{
		displayName: 'Domain',
		name: 'domain',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'example.com',
		displayOptions: { show: { resource: ['watchlist'], operation: ['removeDomain'] } },
		description: 'The domain exactly as the list holds it',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['watchlist'], operation: ['getAll', 'getDomains'] } },
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: {
			show: { resource: ['watchlist'], operation: ['getAll', 'getDomains'], returnAll: [false] },
		},
		description: 'Max number of results to return',
	},
];
