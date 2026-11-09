import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	apiJson,
	apiRequest,
	buildCriteria,
	buildFilters,
	buildSelection,
	buildTab,
	extractDomain,
	FREE_EMAIL_DOMAINS,
	parseDomainList,
	parseIdList,
} from './GenericFunctions';
import { feedbackFields, feedbackOperations } from './descriptions/FeedbackDescription';
import { revealFields, revealOperations } from './descriptions/RevealDescription';
import { signalSetFields, signalSetOperations } from './descriptions/SignalSetDescription';
import { storeFields, storeOperations } from './descriptions/StoreDescription';
import { watchlistFields, watchlistOperations } from './descriptions/WatchlistDescription';

// The API accepts at most 50 domains for each "add domains" call.
const ADD_DOMAINS_CHUNK = 50;

export class EcommerceLeads implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Ecommerce Leads',
		name: 'ecommerceLeads',
		icon: { light: 'file:ecommerceLeads.svg', dark: 'file:ecommerceLeads.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Find ecommerce stores with buying signals: revenue, traffic, ad spend and decision makers',
		defaults: {
			name: 'Ecommerce Leads',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'ecommerceLeadsApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Feedback', value: 'feedback' },
					{ name: 'Reveal', value: 'reveal' },
					{ name: 'Signal Set', value: 'signalSet' },
					{ name: 'Store', value: 'store' },
					{ name: 'Watchlist', value: 'watchlist' },
				],
				default: 'store',
			},
			...storeOperations,
			...storeFields,
			...signalSetOperations,
			...signalSetFields,
			...watchlistOperations,
			...watchlistFields,
			...revealOperations,
			...revealFields,
			...feedbackOperations,
			...feedbackFields,
		],
	};

	methods = {
		loadOptions: {
			async getWatchlists(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const data = await apiJson.call(this, 'GET', '/api/watchlists');
				const lists = (data.watchlists as IDataObject[] | undefined) ?? [];
				return lists.map((list) => ({
					name:
						list.type === 'blacklist'
							? `${list.name as string} (blacklist, ${list.domainCount as number} domains)`
							: `${list.name as string} (${list.domainCount as number} domains)`,
					value: list.id as number,
				}));
			},

			async getSignalSets(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const data = await apiJson.call(this, 'GET', '/api/signal-sets');
				const sets = (data.sets as IDataObject[] | undefined) ?? [];
				return sets.map((set) => ({
					name: set.name as string,
					value: set.id as number,
				}));
			},

			async getSignals(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const data = await apiJson.call(this, 'GET', '/api/signal-sets');
				const catalog = (data.catalog as IDataObject[] | undefined) ?? [];
				return catalog.map((signal) => ({
					name: signal.label as string,
					value: signal.id as string,
					description: (signal.tooltip as string | undefined) ?? (signal.category as string),
				}));
			},

			async getIcpColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const data = await apiJson.call(this, 'GET', '/api/signal-sets');
				const columns = (data.icpColumns as IDataObject[] | undefined) ?? [];
				return columns.map((column) => ({
					name: (column.label as string | undefined) ?? (column.key as string),
					value: column.key as string,
					description: column.type as string | undefined,
				}));
			},

			async getStoreColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const data = await apiJson.call(this, 'POST', '/api/stores/search', {
					body: { includeColumns: true },
				});
				const columns = (data.columns as IDataObject[] | undefined) ?? [];
				return columns.map((column) => ({
					name: (column.label as string | undefined) ?? (column.key as string),
					value: column.key as string,
					description: column.type as string | undefined,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				// Each operation fills "results" with one or more JSON objects (or binary items).
				const results: INodeExecutionData[] = [];
				const pushJson = (json: IDataObject) => results.push({ json, pairedItem: { item: i } });

				if (resource === 'store') {
					if (operation === 'lookup') {
						const input = this.getNodeParameter('domain', i) as string;
						const simplify = this.getNodeParameter('simplify', i) as boolean;
						const domain = extractDomain(input);
						if (domain === '' || FREE_EMAIL_DOMAINS.includes(domain)) {
							pushJson({
								found: false,
								input,
								reason: domain === '' ? 'No domain in the input' : 'Free email domain',
							});
						} else {
							const response = await apiRequest.call(this, 'GET', '/api/stores/lookup', {
								qs: { domain },
								allowStatuses: [404],
								itemIndex: i,
							});
							if (response.statusCode === 404) {
								pushJson({ found: false, input, basedomain: domain, reason: 'Store not found' });
							} else {
								const data = response.body as IDataObject;
								if (simplify) {
									const { fields, ...rest } = data;
									pushJson({ found: true, ...rest, ...((fields as IDataObject) ?? {}) });
								} else {
									pushJson({ found: true, ...data });
								}
							}
						}
					} else if (operation === 'getChart') {
						const domain = extractDomain(this.getNodeParameter('domain', i) as string);
						const metric = this.getNodeParameter('metric', i) as string;
						const data = await apiJson.call(this, 'GET', '/api/stores/chart', {
							qs: { domain, metric },
							itemIndex: i,
						});
						const labels = (data.labels as string[] | undefined) ?? [];
						const values = (data.values as number[] | undefined) ?? [];
						pushJson({
							domain,
							...data,
							points: labels.map((label, index) => ({ label, value: values[index] })),
						});
					} else if (operation === 'search') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const limit = returnAll ? Infinity : (this.getNodeParameter('limit', i) as number);
						const options = this.getNodeParameter('options', i, {}) as IDataObject;
						const body: IDataObject = { tab: buildTab.call(this, i) };
						const filters = buildFilters(this.getNodeParameter('filters', i, {}) as IDataObject);
						if (filters.length > 0) {
							body.filters = filters;
						}
						if (options.allColumns === true) {
							body.columns = ['*'];
						} else if (Array.isArray(options.columns) && options.columns.length > 0) {
							body.columns = options.columns;
						}
						if (typeof options.sortColumn === 'string' && options.sortColumn !== '') {
							body.sort = {
								column: options.sortColumn,
								direction: (options.sortDirection as string | undefined) ?? 'desc',
							};
						}
						let page = 1;
						let count = 0;
						let hasMore = true;
						while (hasMore && count < limit) {
							const data = await apiJson.call(this, 'POST', '/api/stores/search', {
								body: { ...body, page },
								itemIndex: i,
							});
							const rows = (data.rows as IDataObject[] | undefined) ?? [];
							for (const row of rows) {
								if (count >= limit) break;
								pushJson(row);
								count++;
							}
							hasMore = data.hasMore === true && rows.length > 0;
							page++;
						}
					} else if (operation === 'export') {
						const format = this.getNodeParameter('format', i) as string;
						const visibleColumns = this.getNodeParameter('visibleColumns', i, []) as string[];
						const body: IDataObject = { selection: buildSelection.call(this, i), format };
						if (visibleColumns.length > 0) {
							body.visibleColumns = visibleColumns;
						}
						if (format === 'csv') {
							const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
							const response = await apiRequest.call(this, 'POST', '/api/stores/export', {
								body,
								binary: true,
								itemIndex: i,
							});
							const buffer = Buffer.from(response.body as ArrayBuffer);
							const binaryData = await this.helpers.prepareBinaryData(
								buffer,
								'ecommerce-leads-export.csv',
								'text/csv',
							);
							results.push({
								json: { fileName: 'ecommerce-leads-export.csv', bytes: buffer.length },
								binary: { [binaryPropertyName]: binaryData },
								pairedItem: { item: i },
							});
						} else {
							const data = await apiJson.call(this, 'POST', '/api/stores/export', {
								body,
								itemIndex: i,
							});
							for (const record of (data.records as IDataObject[] | undefined) ?? []) {
								pushJson(record);
							}
						}
					} else if (operation === 'updateOutreachStatus') {
						const storeId = this.getNodeParameter('storeId', i) as number;
						const status = this.getNodeParameter('status', i) as string;
						const data = await apiJson.call(
							this,
							'PATCH',
							`/api/stores/${storeId}/outreach-status`,
							{ body: { status }, itemIndex: i },
						);
						pushJson({ storeId, ...data });
					}
				} else if (resource === 'signalSet') {
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const data = await apiJson.call(this, 'GET', '/api/signal-sets', { itemIndex: i });
						let sets = (data.sets as IDataObject[] | undefined) ?? [];
						if (!returnAll) {
							sets = sets.slice(0, this.getNodeParameter('limit', i) as number);
						}
						sets.forEach((set) => pushJson(set));
					} else if (operation === 'getCatalog') {
						const data = await apiJson.call(this, 'GET', '/api/signal-sets', { itemIndex: i });
						delete data.sets;
						pushJson(data);
					} else if (operation === 'get') {
						const setId = this.getNodeParameter('setId', i) as string | number;
						const data = await apiJson.call(this, 'GET', `/api/signal-sets/${setId}`, {
							itemIndex: i,
						});
						pushJson((data.set as IDataObject | undefined) ?? data);
					} else if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;
						const criteria = buildCriteria.call(this, i);
						pushJson(
							await apiJson.call(this, 'POST', '/api/signal-sets', {
								body: { name, criteria },
								itemIndex: i,
							}),
						);
					} else if (operation === 'replaceCriteria') {
						const setId = this.getNodeParameter('setId', i) as string | number;
						const criteria = buildCriteria.call(this, i);
						pushJson(
							await apiJson.call(this, 'PUT', `/api/signal-sets/${setId}`, {
								body: { criteria },
								itemIndex: i,
							}),
						);
					} else if (operation === 'preview') {
						const criteria = buildCriteria.call(this, i);
						const options = this.getNodeParameter('options', i, {}) as IDataObject;
						const body: IDataObject = { criteria };
						if (options.setId !== undefined && options.setId !== '') {
							body.setId = Number(options.setId);
						}
						pushJson(
							await apiJson.call(this, 'POST', '/api/signal-sets/preview', {
								body,
								itemIndex: i,
							}),
						);
					} else if (operation === 'delete') {
						const setId = this.getNodeParameter('setId', i) as string | number;
						pushJson(
							await apiJson.call(this, 'DELETE', `/api/signal-sets/${setId}`, { itemIndex: i }),
						);
					}
				} else if (resource === 'watchlist') {
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const data = await apiJson.call(this, 'GET', '/api/watchlists', { itemIndex: i });
						let lists = (data.watchlists as IDataObject[] | undefined) ?? [];
						if (!returnAll) {
							lists = lists.slice(0, this.getNodeParameter('limit', i) as number);
						}
						lists.forEach((list) => pushJson(list));
					} else if (operation === 'getDomains') {
						const listId = this.getNodeParameter('listId', i) as string | number;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const limit = returnAll ? Infinity : (this.getNodeParameter('limit', i) as number);
						let page = 1;
						let totalPages = 1;
						let count = 0;
						do {
							const data = await apiJson.call(this, 'GET', `/api/watchlists/${listId}`, {
								qs: { page },
								itemIndex: i,
							});
							totalPages = (data.totalPages as number | undefined) ?? 1;
							for (const domain of (data.domains as string[] | undefined) ?? []) {
								if (count >= limit) break;
								pushJson({ domain, listId: data.id, listName: data.name, listType: data.type });
								count++;
							}
							page++;
						} while (page <= totalPages && count < limit);
					} else if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;
						pushJson(
							await apiJson.call(this, 'POST', '/api/watchlists', {
								body: { name },
								itemIndex: i,
							}),
						);
					} else if (operation === 'rename') {
						const listId = this.getNodeParameter('listId', i) as string | number;
						const name = this.getNodeParameter('name', i) as string;
						pushJson(
							await apiJson.call(this, 'PATCH', `/api/watchlists/${listId}`, {
								body: { name },
								itemIndex: i,
							}),
						);
					} else if (operation === 'delete') {
						const listId = this.getNodeParameter('listId', i) as string | number;
						pushJson(
							await apiJson.call(this, 'DELETE', `/api/watchlists/${listId}`, { itemIndex: i }),
						);
					} else if (operation === 'addDomains') {
						const listId = this.getNodeParameter('listId', i) as string | number;
						const domains = parseDomainList(this.getNodeParameter('domains', i) as string);
						if (domains.length === 0) {
							throw new NodeOperationError(this.getNode(), 'Enter at least one domain', {
								itemIndex: i,
							});
						}
						const total: IDataObject = {
							listId: Number(listId),
							added: 0,
							alreadyPresent: 0,
							rejected: 0,
							total: 0,
							balance: null,
						};
						for (let start = 0; start < domains.length; start += ADD_DOMAINS_CHUNK) {
							const chunk = domains.slice(start, start + ADD_DOMAINS_CHUNK);
							const data = await apiJson.call(this, 'POST', `/api/watchlists/${listId}/domains`, {
								body: { domains: chunk },
								itemIndex: i,
							});
							total.added = (total.added as number) + ((data.added as number | undefined) ?? 0);
							total.alreadyPresent =
								(total.alreadyPresent as number) +
								((data.alreadyPresent as number | undefined) ?? 0);
							total.rejected =
								(total.rejected as number) + ((data.rejected as number | undefined) ?? 0);
							total.total = data.total ?? total.total;
							total.balance = data.balance ?? total.balance;
						}
						pushJson(total);
					} else if (operation === 'removeDomain') {
						const listId = this.getNodeParameter('listId', i) as string | number;
						const domain = (this.getNodeParameter('domain', i) as string).trim();
						pushJson(
							await apiJson.call(
								this,
								'DELETE',
								`/api/watchlists/${listId}/domains/${encodeURIComponent(domain)}`,
								{ itemIndex: i },
							),
						);
					}
				} else if (resource === 'reveal') {
					if (operation === 'getCost') {
						pushJson(
							await apiJson.call(this, 'POST', '/api/reveals/cost', {
								body: { selection: buildSelection.call(this, i) },
								itemIndex: i,
							}),
						);
					} else if (operation === 'reveal') {
						const action = this.getNodeParameter('revealType', i) as string;
						const maxCredits = this.getNodeParameter('maxCredits', i, 0) as number;
						const selection = buildSelection.call(this, i);
						if (maxCredits > 0) {
							const costData = await apiJson.call(this, 'POST', '/api/reveals/cost', {
								body: { selection },
								itemIndex: i,
							});
							const cost = ((costData.costs as IDataObject | undefined)?.[action] as number) ?? 0;
							if (cost > maxCredits) {
								throw new NodeOperationError(
									this.getNode(),
									`This reveal costs ${cost} credits. Max Credits is ${maxCredits}. Nothing was charged.`,
									{
										itemIndex: i,
										description: 'Raise Max Credits, or select fewer stores.',
									},
								);
							}
						}
						pushJson(
							await apiJson.call(this, 'POST', '/api/reveals', {
								body: { action, selection },
								itemIndex: i,
							}),
						);
					} else if (operation === 'getStatus') {
						const ids = parseIdList.call(
							this,
							this.getNodeParameter('statusStoreIds', i) as string,
							'Store IDs',
							i,
						);
						if (ids.length === 0 || ids.length > 300) {
							throw new NodeOperationError(
								this.getNode(),
								`Enter 1 to 300 store IDs. You entered ${ids.length}.`,
								{ itemIndex: i },
							);
						}
						pushJson(
							await apiJson.call(this, 'GET', '/api/reveals/status', {
								qs: { storeIds: ids.join(',') },
								itemIndex: i,
							}),
						);
					}
				} else if (resource === 'feedback') {
					if (operation === 'send') {
						const message = this.getNodeParameter('message', i) as string;
						pushJson(
							await apiJson.call(this, 'POST', '/api/feedback', {
								body: { message },
								itemIndex: i,
							}),
						);
					}
				}

				returnData.push(...results);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				// Both constructors return the same object when they get an error of their own type,
				// so an error from apiRequest keeps its HTTP code and description.
				if (error instanceof NodeApiError) {
					throw new NodeApiError(this.getNode(), error as unknown as JsonObject);
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
