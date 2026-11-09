import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

export const BASE_URL = 'https://getecommerceleads.com';

type Context = IExecuteFunctions | ILoadOptionsFunctions;

export interface ApiResponse {
	statusCode: number;
	body: unknown;
	headers: IDataObject;
}

interface RequestOptions {
	body?: IDataObject;
	qs?: IDataObject;
	// Status codes that the caller handles. The helper returns them and does not throw.
	allowStatuses?: number[];
	// Return the body as a Buffer (for a CSV export).
	binary?: boolean;
	itemIndex?: number;
}

function parseBody(body: unknown): unknown {
	if (body instanceof Uint8Array) {
		const text = new TextDecoder().decode(body);
		try {
			return JSON.parse(text);
		} catch {
			return text;
		}
	}
	return body;
}

/**
 * Calls the Ecommerce Leads REST API with the API key credential.
 * Errors have the form {"error": "..."}. The helper turns them into a NodeApiError with that text.
 */
export async function apiRequest(
	this: Context,
	method: IHttpRequestMethods,
	endpoint: string,
	options: RequestOptions = {},
): Promise<ApiResponse> {
	const requestOptions: IHttpRequestOptions = {
		method,
		url: `${BASE_URL}${endpoint}`,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
		json: !options.binary,
	};
	if (options.qs && Object.keys(options.qs).length > 0) {
		requestOptions.qs = options.qs;
	}
	if (options.body !== undefined) {
		requestOptions.body = options.body;
		requestOptions.headers = { 'Content-Type': 'application/json' };
		if (options.binary) {
			requestOptions.body = JSON.stringify(options.body);
		}
	}
	if (options.binary) {
		requestOptions.encoding = 'arraybuffer';
	}

	const response = (await this.helpers.httpRequestWithAuthentication.call(
		this,
		'ecommerceLeadsApi',
		requestOptions,
	)) as { statusCode: number; body: unknown; headers: IDataObject };

	const statusCode = response.statusCode;
	if (statusCode < 400 || (options.allowStatuses ?? []).includes(statusCode)) {
		return { statusCode, body: response.body, headers: response.headers ?? {} };
	}

	const body = parseBody(response.body);
	const errorBody: IDataObject =
		body !== null && typeof body === 'object' ? (body as IDataObject) : { error: String(body) };
	let message = typeof errorBody.error === 'string' ? errorBody.error : `HTTP ${statusCode}`;
	let description: string | undefined;

	if (statusCode === 401) {
		description =
			'The API key is not valid. Copy the key again from Settings > Integrations in Ecommerce Leads.';
	} else if (statusCode === 402) {
		description = `This action costs ${errorBody.cost ?? '?'} credits. Your balance is ${errorBody.balance ?? '?'} credits. Nothing was charged.`;
	} else if (statusCode === 403) {
		description =
			'Your plan does not allow this action, or your account is not active. Most routes need a paid plan.';
	} else if (statusCode === 429) {
		const retryAfter = response.headers?.['retry-after'];
		description = `Rate limit reached. Wait ${retryAfter ?? 60} seconds. Use the node setting "Retry On Fail" with a wait time to retry automatically.`;
	} else if (statusCode === 502 || statusCode === 503) {
		message = message === `HTTP ${statusCode}` ? 'The Ecommerce Leads service is busy' : message;
		description = 'Try again in a few seconds.';
	}

	throw new NodeApiError(this.getNode(), errorBody as JsonObject, {
		message,
		description,
		httpCode: String(statusCode),
		itemIndex: options.itemIndex,
	});
}

/** Shortcut for a JSON call that returns only the body. */
export async function apiJson(
	this: Context,
	method: IHttpRequestMethods,
	endpoint: string,
	options: RequestOptions = {},
): Promise<IDataObject> {
	const response = await apiRequest.call(this, method, endpoint, options);
	const body = parseBody(response.body);
	if (body !== null && typeof body === 'object' && !Array.isArray(body)) {
		return body as IDataObject;
	}
	return { text: body as string };
}

// Email domains that are never a store. A lookup for these makes no API call.
export const FREE_EMAIL_DOMAINS = [
	'gmail.com',
	'googlemail.com',
	'yahoo.com',
	'yahoo.co.uk',
	'hotmail.com',
	'hotmail.co.uk',
	'outlook.com',
	'live.com',
	'msn.com',
	'icloud.com',
	'me.com',
	'mac.com',
	'aol.com',
	'proton.me',
	'protonmail.com',
	'gmx.com',
	'gmx.de',
	'web.de',
	'mail.com',
	'yandex.com',
	'zoho.com',
	'qq.com',
	'163.com',
];

/** "jane@example.com", "https://www.example.com/shop" and "example.com" all give "example.com". */
export function extractDomain(input: string): string {
	let value = String(input ?? '')
		.trim()
		.toLowerCase();
	if (value.includes('@')) {
		value = value.split('@').pop() ?? '';
	}
	return value
		.replace(/^https?:\/\//, '')
		.replace(/^www\./, '')
		.replace(/[/?#].*$/, '');
}

/** "1, 2,3" or "1\n2" gives [1, 2, 3]. Throws on a value that is not a positive integer. */
export function parseIdList(
	this: IExecuteFunctions,
	input: string,
	fieldName: string,
	itemIndex: number,
): number[] {
	const parts = String(input ?? '')
		.split(/[\s,]+/)
		.map((part) => part.trim())
		.filter((part) => part !== '');
	const ids: number[] = [];
	for (const part of parts) {
		if (!/^\d+$/.test(part) || Number(part) < 1) {
			throw new NodeOperationError(
				this.getNode(),
				`${fieldName} must hold store IDs (positive integers). "${part}" is not valid.`,
				{ itemIndex },
			);
		}
		ids.push(Number(part));
	}
	return ids;
}

/** Splits a text of domains (commas, spaces or new lines) into a clean list. */
export function parseDomainList(input: string): string[] {
	const domains = String(input ?? '')
		.split(/[\s,;]+/)
		.map((part) => extractDomain(part))
		.filter((part) => part !== '');
	return [...new Set(domains)];
}

const NUMBER_OPERATORS = ['gt', 'gte', 'lt', 'lte', 'eq', 'neq', 'isWithinLast'];

/** Sends a number when the operator compares numbers and the text is a number. */
export function filterValue(operator: string, value: unknown): string | number {
	if (typeof value === 'string' && NUMBER_OPERATORS.includes(operator)) {
		const trimmed = value.trim();
		if (trimmed !== '' && !isNaN(Number(trimmed))) {
			return Number(trimmed);
		}
	}
	return typeof value === 'number' ? value : String(value ?? '');
}

const NO_VALUE_OPERATORS = ['isEmpty', 'isNotEmpty', 'exists', 'notExists'];

/** Converts the "Filters" fixed collection to the API format [{column, operator, value}]. */
export function buildFilters(filtersParam: IDataObject): IDataObject[] {
	const rows = (filtersParam?.filter as IDataObject[] | undefined) ?? [];
	return rows
		.filter((row) => typeof row.column === 'string' && row.column !== '')
		.map((row) => {
			const operator = row.operator as string;
			const filter: IDataObject = { column: row.column, operator };
			if (!NO_VALUE_OPERATORS.includes(operator)) {
				filter.value = filterValue(operator, row.value);
			}
			return filter;
		});
}

/** Builds the "tab" value: all, revealed, set:{id} or watchlist:{id}. */
export function buildTab(this: IExecuteFunctions, itemIndex: number): string {
	const source = this.getNodeParameter('source', itemIndex) as string;
	if (source === 'signalSet') {
		const setId = this.getNodeParameter('signalSetId', itemIndex) as string | number;
		return `set:${setId}`;
	}
	if (source === 'watchlist') {
		const listId = this.getNodeParameter('watchlistId', itemIndex) as string | number;
		return `watchlist:${listId}`;
	}
	return source;
}

/** Builds the "selection" object for export, reveal cost and reveal. */
export function buildSelection(this: IExecuteFunctions, itemIndex: number): IDataObject {
	const selectBy = this.getNodeParameter('selectBy', itemIndex) as string;
	if (selectBy === 'ids') {
		const ids = parseIdList.call(
			this,
			this.getNodeParameter('storeIds', itemIndex) as string,
			'Store IDs',
			itemIndex,
		);
		if (ids.length === 0) {
			throw new NodeOperationError(this.getNode(), 'Enter at least one store ID', { itemIndex });
		}
		return { ids };
	}
	const selection: IDataObject = { tab: buildTab.call(this, itemIndex) };
	const filters = buildFilters(this.getNodeParameter('filters', itemIndex, {}) as IDataObject);
	if (filters.length > 0) {
		selection.filters = filters;
	}
	const deselected = parseIdList.call(
		this,
		this.getNodeParameter('deselected', itemIndex, '') as string,
		'Exclude Store IDs',
		itemIndex,
	);
	if (deselected.length > 0) {
		selection.deselected = deselected;
	}
	return selection;
}

/** Builds the signal set "criteria" object from the simple fields or from the JSON field. */
export function buildCriteria(this: IExecuteFunctions, itemIndex: number): IDataObject {
	const mode = this.getNodeParameter('criteriaMode', itemIndex) as string;
	if (mode === 'json') {
		const raw = this.getNodeParameter('criteriaJson', itemIndex) as string | IDataObject;
		let criteria: unknown = raw;
		if (typeof raw === 'string') {
			try {
				criteria = JSON.parse(raw);
			} catch {
				throw new NodeOperationError(this.getNode(), 'Criteria (JSON) is not valid JSON', {
					itemIndex,
				});
			}
		}
		if (criteria === null || typeof criteria !== 'object' || Array.isArray(criteria)) {
			throw new NodeOperationError(this.getNode(), 'Criteria (JSON) must be a JSON object', {
				itemIndex,
			});
		}
		return criteria as IDataObject;
	}

	const signalIds = this.getNodeParameter('signalIds', itemIndex, []) as string[];
	const legacyCategories = this.getNodeParameter('legacyCategories', itemIndex, []) as string[];
	const icpParam = this.getNodeParameter('icpFilters', itemIndex, {}) as IDataObject;
	const icpFilters = ((icpParam.filter as IDataObject[] | undefined) ?? [])
		.filter((row) => typeof row.column === 'string' && row.column !== '')
		.map((row) => {
			const operator = row.operator as string;
			const filter: IDataObject = { column: row.column, operator };
			if (operator !== 'isEmpty') {
				filter.value = filterValue(operator, row.value);
			}
			return filter;
		});

	if (signalIds.length === 0 && legacyCategories.length === 0 && icpFilters.length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			'Choose at least one signal, signal category or store filter',
			{ itemIndex },
		);
	}
	return { signalIds, legacyCategories, icpFilters };
}
