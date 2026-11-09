import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class EcommerceLeadsApi implements ICredentialType {
	name = 'ecommerceLeadsApi';

	displayName = 'Ecommerce Leads API';

	icon: Icon = { light: 'file:ecommerceLeads.svg', dark: 'file:ecommerceLeads.dark.svg' };

	documentationUrl = 'https://github.com/matosdfm/n8n-nodes-ecommerce-leads#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				'Find your API key in Ecommerce Leads under Settings > Integrations. The key starts with el_.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	// GET /api/watchlists is cheap and writes no lookup log. It needs a paid plan,
	// and only paid users can create a key.
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://getecommerceleads.com',
			url: '/api/watchlists',
			method: 'GET',
		},
	};
}
