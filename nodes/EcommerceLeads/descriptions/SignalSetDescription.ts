import type { INodeProperties } from 'n8n-workflow';

const LEGACY_CATEGORIES = [
	{ name: 'Bing Ads', value: 'bingAds' },
	{ name: 'Organic Instagram', value: 'organicInstagram' },
	{ name: 'Organic TikTok', value: 'organicTiktok' },
	{ name: 'Paid Meta', value: 'paidMeta' },
	{ name: 'Paid Search', value: 'paidSearch' },
	{ name: 'Paid TikTok', value: 'paidTiktok' },
	{ name: 'SEO', value: 'seo' },
];

const CRITERIA_EXAMPLE = `{
  "root": {
    "type": "group",
    "op": "AND",
    "children": [
      { "type": "legacyCategory", "category": "paidMeta" },
      { "type": "icp", "column": "Country", "operator": "eq", "value": "US" }
    ]
  }
}`;

export const signalSetOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['signalSet'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a signal set',
				action: 'Create a signal set',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a signal set. This cannot be undone.',
				action: 'Delete a signal set',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a signal set with its criteria',
				action: 'Get a signal set',
			},
			{
				name: 'Get Catalog',
				value: 'getCatalog',
				description: 'Get the signals and store filters that you can use in criteria',
				action: 'Get the signal catalog',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get your signal sets',
				action: 'Get many signal sets',
			},
			{
				name: 'Preview',
				value: 'preview',
				description: 'Check whether criteria match enough stores (80 or more). Saves nothing.',
				action: 'Preview signal set criteria',
			},
			{
				name: 'Replace Criteria',
				value: 'replaceCriteria',
				description: 'Replace all criteria of a signal set. The old criteria are lost.',
				action: 'Replace the criteria of a signal set',
			},
		],
		default: 'getAll',
	},
];

export const signalSetFields: INodeProperties[] = [
	{
		displayName: 'Signal Set Name or ID',
		name: 'setId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getSignalSets' },
		required: true,
		default: '',
		displayOptions: {
			show: { resource: ['signalSet'], operation: ['get', 'delete', 'replaceCriteria'] },
		},
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},

	// ----------------------------------------
	//             signalSet: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['signalSet'], operation: ['getAll'] } },
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: {
			show: { resource: ['signalSet'], operation: ['getAll'], returnAll: [false] },
		},
		description: 'Max number of results to return',
	},

	// ----------------------------------------
	//             signalSet: create
	// ----------------------------------------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['signalSet'], operation: ['create'] } },
		description: 'The name of the new signal set. At most 100 characters.',
	},

	// ----------------------------------------
	//   signalSet: create, replaceCriteria, preview
	// ----------------------------------------
	{
		displayName: 'Define Criteria',
		name: 'criteriaMode',
		type: 'options',
		default: 'fields',
		displayOptions: {
			show: { resource: ['signalSet'], operation: ['create', 'replaceCriteria', 'preview'] },
		},
		options: [
			{
				name: 'Using Fields Below',
				value: 'fields',
				description: 'A store matches when it has any of the signals and passes all filters',
			},
			{
				name: 'Using JSON',
				value: 'json',
				description: 'A criteria tree with AND, OR and NOT groups',
			},
		],
	},
	{
		displayName: 'Signal Names or IDs',
		name: 'signalIds',
		type: 'multiOptions',
		typeOptions: { loadOptionsMethod: 'getSignals' },
		default: [],
		displayOptions: {
			show: {
				resource: ['signalSet'],
				operation: ['create', 'replaceCriteria', 'preview'],
				criteriaMode: ['fields'],
			},
		},
		description:
			'Buying signals from the catalog. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Signal Categories',
		name: 'legacyCategories',
		type: 'multiOptions',
		default: [],
		displayOptions: {
			show: {
				resource: ['signalSet'],
				operation: ['create', 'replaceCriteria', 'preview'],
				criteriaMode: ['fields'],
			},
		},
		options: LEGACY_CATEGORIES,
		description: 'Broad signal categories. Each one matches every signal of that channel.',
	},
	{
		displayName: 'Store Filters',
		name: 'icpFilters',
		type: 'fixedCollection',
		placeholder: 'Add Store Filter',
		typeOptions: { multipleValues: true },
		default: {},
		displayOptions: {
			show: {
				resource: ['signalSet'],
				operation: ['create', 'replaceCriteria', 'preview'],
				criteriaMode: ['fields'],
			},
		},
		description: 'Store attributes that every lead must match. At most 20.',
		options: [
			{
				displayName: 'Filter',
				name: 'filter',
				values: [
					{
						displayName: 'Column Name or ID',
						name: 'column',
						type: 'options',
						typeOptions: { loadOptionsMethod: 'getIcpColumns' },
						default: '',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
					},
					{
						displayName: 'Operator',
						name: 'operator',
						type: 'options',
						default: 'eq',
						options: [
							{ name: 'Contains', value: 'contains', description: 'Text columns' },
							{ name: 'Does Not Contain', value: 'notContains', description: 'Text columns' },
							{ name: 'Does Not Have', value: 'doesNotHave', description: 'Tag columns' },
							{ name: 'Equals', value: 'eq' },
							{ name: 'Greater Than', value: 'gt', description: 'Number columns' },
							{ name: 'Greater Than or Equal', value: 'gte', description: 'Number columns' },
							{ name: 'Has', value: 'has', description: 'Tag columns' },
							{ name: 'Is Empty', value: 'isEmpty' },
							{ name: 'Less Than', value: 'lt', description: 'Number columns' },
							{ name: 'Less Than or Equal', value: 'lte', description: 'Number columns' },
							{ name: 'Not Equal', value: 'neq' },
						],
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						displayOptions: { hide: { operator: ['isEmpty'] } },
					},
				],
			},
		],
	},
	{
		displayName: 'Criteria (JSON)',
		name: 'criteriaJson',
		type: 'json',
		required: true,
		default: CRITERIA_EXAMPLE,
		displayOptions: {
			show: {
				resource: ['signalSet'],
				operation: ['create', 'replaceCriteria', 'preview'],
				criteriaMode: ['json'],
			},
		},
		description:
			'Either {"root": ...} (a tree of group, not, signal, legacyCategory and icp nodes) or {"signalIds": [], "legacyCategories": [], "icpFilters": []}. Use Get Catalog to see the signal IDs and columns.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['signalSet'], operation: ['preview'] } },
		options: [
			{
				displayName: 'Signal Set Name or ID',
				name: 'setId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getSignalSets' },
				default: '',
				description:
					'The set that you are editing. Its stored custom SQL conditions are then accepted. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},
];
