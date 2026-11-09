import type { INodeProperties } from 'n8n-workflow';
import { selectionFields } from './SharedFields';

export const revealOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['reveal'] } },
		options: [
			{
				name: 'Get Cost',
				value: 'getCost',
				description: 'Get the credit cost of each reveal action. Charges nothing.',
				action: 'Get the cost of a reveal',
			},
			{
				name: 'Get Status',
				value: 'getStatus',
				description: 'Get the status of contact searches and your credit balance',
				action: 'Get the status of reveals',
			},
			{
				name: 'Reveal',
				value: 'reveal',
				description:
					'Reveal store details or start a decision-maker search. Spends credits and cannot be undone.',
				action: 'Reveal stores',
			},
		],
		default: 'getCost',
	},
];

export const revealFields: INodeProperties[] = [
	{
		displayName: 'Reveal Type',
		name: 'revealType',
		type: 'options',
		default: 'details',
		displayOptions: { show: { resource: ['reveal'], operation: ['reveal'] } },
		options: [
			{
				name: 'Store Details',
				value: 'details',
				description: '1 credit for each store that is not revealed',
			},
			{
				name: 'CEO Contact',
				value: 'ceo',
				description: 'Start a search for the CEO or founder',
			},
			{
				name: 'Marketing Contact',
				value: 'marketing',
				description: 'Start a search for the head of marketing',
			},
			{
				name: 'Ecommerce Contact',
				value: 'ecommerce',
				description: 'Start a search for the head of ecommerce',
			},
		],
		description:
			'A contact search costs 1 credit for each store without that contact, plus 1 credit if the store details are not revealed. Contact searches run in a queue: use Get Status, then Store > Look Up to read the contacts.',
	},
	...selectionFields({ show: { resource: ['reveal'], operation: ['getCost', 'reveal'] } }),
	{
		displayName: 'Max Credits',
		name: 'maxCredits',
		type: 'number',
		typeOptions: { minValue: 0 },
		default: 0,
		displayOptions: { show: { resource: ['reveal'], operation: ['reveal'] } },
		description:
			'The highest number of credits that this reveal may spend. The node checks the cost first and stops with an error if the cost is higher. 0 means no limit.',
	},
	{
		displayName: 'Store IDs',
		name: 'statusStoreIds',
		type: 'string',
		required: true,
		default: '',
		placeholder: '123, 456',
		displayOptions: { show: { resource: ['reveal'], operation: ['getStatus'] } },
		description: 'Store IDs, separated by commas. At most 300.',
	},
];
