import type { INodeProperties } from 'n8n-workflow';

export const feedbackOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['feedback'] } },
		options: [
			{
				name: 'Send',
				value: 'send',
				description: 'Send a message to the Ecommerce Leads team. At most 5 each hour.',
				action: 'Send feedback',
			},
		],
		default: 'send',
	},
];

export const feedbackFields: INodeProperties[] = [
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		displayOptions: { show: { resource: ['feedback'], operation: ['send'] } },
		description: 'The message. 3 to 3000 characters.',
	},
];
