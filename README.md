# n8n-nodes-ecommerce-leads

This is an n8n community node for [Ecommerce Leads](https://getecommerceleads.com). Use it in your n8n workflows to find ecommerce stores that show buying signals.

Ecommerce Leads monitors about 500,000 ecommerce stores. For each store, it gives the estimated revenue, traffic, Google and Meta ad spend, ad counts, a Conversion Rate Score, buying signals, and decision-maker contacts.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

- [Installation](#installation)
- [Credentials](#credentials)
- [Operations](#operations)
- [Credits and limits](#credits-and-limits)
- [Example workflows](#example-workflows)
- [Compatibility](#compatibility)
- [Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation. The package name is `n8n-nodes-ecommerce-leads`.

## Credentials

The node uses an API key.

1. Log in to Ecommerce Leads. You need a paid plan.
2. Go to **Settings > Integrations**: https://getecommerceleads.com/d/settings/integrations
3. Click **Generate API key**. Copy the key. It starts with `el_`. Ecommerce Leads shows the key only one time.
4. In n8n, create a new **Ecommerce Leads API** credential. Paste the key in **API Key**.

n8n tests the credential with a call to `GET /api/watchlists`.

Anyone with the key can spend your credits. Keep it secret. If the key leaks, click **Regenerate** or **Revoke** on the same Settings page.

## Operations

### Store

| Operation              | What it does                                                                                                                                                                                                                                                     | Credits |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Look Up                | Gets the data of one store from a domain, a URL or an email. Free email domains (gmail.com and others) return `found: false` without an API call. A store that is not in the database returns `found: false`. Turn off **Simplify** to get the raw API response. | 0       |
| Search                 | Searches the store catalog. Choose a source (all stores, revealed stores, a signal set or a watchlist), add column filters, and sort. Returns one item for each store.                                                                                           | 0       |
| Get Metric History     | Gets the latest 24 data points of one metric (revenue, traffic, ad spend, followers and more).                                                                                                                                                                   | 0       |
| Export                 | Exports revealed stores as a CSV file (binary field) or as one item for each store.                                                                                                                                                                              | 0       |
| Update Outreach Status | Sets your status for a revealed store: Contacted, Interested, Won and others.                                                                                                                                                                                    | 0       |

### Signal Set

A signal set is a saved group of buying signals and store filters. Its matching stores are your leads.

| Operation        | What it does                                                      |
| ---------------- | ----------------------------------------------------------------- |
| Get Many         | Gets your signal sets.                                            |
| Get              | Gets one signal set with its criteria.                            |
| Get Catalog      | Gets the signals and store filters that you can use in criteria.  |
| Create           | Creates a signal set.                                             |
| Preview          | Checks whether criteria match 80 stores or more. Saves nothing.   |
| Replace Criteria | Replaces all criteria of a signal set. The old criteria are lost. |
| Delete           | Deletes a signal set. This cannot be undone.                      |

You can define criteria in two ways:

- **Using Fields Below**: choose signals and signal categories from lists, and add store filters. A store matches when it has any of the signals and passes all filters.
- **Using JSON**: write a criteria tree with `AND`, `OR` and `NOT` groups. Example:

```json
{
	"root": {
		"type": "group",
		"op": "AND",
		"children": [
			{ "type": "legacyCategory", "category": "paidMeta" },
			{ "type": "icp", "column": "Country", "operator": "eq", "value": "US" }
		]
	}
}
```

### Watchlist

| Operation     | What it does                                                                 | Credits                                                   |
| ------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------- |
| Get Many      | Gets your watchlists and your blacklist, with the domain count of each.      | 0                                                         |
| Get Domains   | Gets the domains of one list. Returns one item for each domain.              | 0                                                         |
| Create        | Creates an empty watchlist. You can have at most 10 lists.                   | 0                                                         |
| Rename        | Changes the name of a watchlist.                                             | 0                                                         |
| Delete        | Deletes a watchlist and its domains. This cannot be undone.                  | 0                                                         |
| Add Domains   | Adds domains, URLs or emails to a list. The node sends them in groups of 50. | 1 for each new domain on a watchlist. 0 on the blacklist. |
| Remove Domain | Removes one domain from a list.                                              | 0                                                         |

### Reveal

| Operation  | What it does                                                                           | Credits                                       |
| ---------- | -------------------------------------------------------------------------------------- | --------------------------------------------- |
| Get Cost   | Gets the credit cost of each reveal type for a group of stores. Charges nothing.       | 0                                             |
| Reveal     | Reveals store details, or starts a search for the CEO, marketing or ecommerce contact. | See [Credits and limits](#credits-and-limits) |
| Get Status | Gets the status of contact searches and your credit balance.                           | 0                                             |

**Max Credits** on the Reveal operation is a safety limit. When it is above 0, the node first gets the cost. If the cost is higher than Max Credits, the node stops with an error and charges nothing.

Contact searches run in a queue. Use **Reveal > Get Status** to follow them. Then use **Store > Look Up** to read the contacts.

### Feedback

| Operation | What it does                                                        |
| --------- | ------------------------------------------------------------------- |
| Send      | Sends a message (3 to 3000 characters) to the Ecommerce Leads team. |

## Credits and limits

- Store details: 1 credit for each store that is not revealed.
- A contact search (CEO, marketing, ecommerce): 1 credit for each store that does not have that contact yet, plus 1 credit if the store details are not revealed.
- A store that is already revealed, or has a search in progress, costs 0.
- If the cost is above your balance, the API returns an error and charges nothing.

Rate limits:

- Each API key: 60 requests per minute.
- Store > Look Up: 20 requests per minute.
- Search, export, signal sets, reveals and outreach status: 50 requests per minute together.
- Feedback: 5 messages per hour.

Over a limit, the node stops with a "Rate limit reached" error. To retry automatically, open the node **Settings** and turn on **Retry On Fail** with **Wait Between Tries** set to 60000 ms.

## Example workflows

### Enrich new CRM contacts with store data

1. A trigger gets a new contact (for example, a HubSpot or Google Sheets trigger).
2. **Ecommerce Leads > Store > Look Up**. Set **Domain or Email** to the contact email, for example `{{ $json.email }}`.
3. An **If** node checks `{{ $json.found }}`.
4. Write the revenue, ad spend and buying signals back to the CRM.

### Send new leads of a signal set to Slack every morning

1. **Schedule Trigger**: every day at 08:00.
2. **Ecommerce Leads > Store > Search**. Set **Source** to **Signal Set** and choose your set. Add a filter: column `Total Traffic`, operator **Greater Than**, value `10000`. Set **Limit** to 20.
3. **Slack > Send Message** with the store name, domain and buying signals.

### Reveal contacts with a credit limit

1. **Ecommerce Leads > Store > Search** with your filters.
2. **Aggregate** node: collect the `storeId` fields into one list.
3. **Ecommerce Leads > Reveal > Reveal**. Set **Reveal Type** to **Marketing Contact**, **Select Stores By** to **Store IDs**, **Store IDs** to `{{ $json.storeId.join(',') }}`, and **Max Credits** to `25`.
4. Later, **Reveal > Get Status** and **Store > Look Up** to read the contacts.

### Use it as an AI agent tool

The node is usable as a tool. Connect it to an **AI Agent** node, and the agent can look up stores, search the catalog and manage watchlists. Do not give an agent the Reveal operation unless you set **Max Credits**.

## Compatibility

Built and tested with n8n node CLI 0.55 and n8n 1.x. The node has no runtime dependencies.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Ecommerce Leads API documentation](https://getecommerceleads.com/docs)
- [OpenAPI schema](https://getecommerceleads.com/openapi.json)
- [Ecommerce Leads](https://getecommerceleads.com)
