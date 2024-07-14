<h1 align="center">svelte-data-table</h1>

<p align="center">Small, fast data table library with client-side sorting, filtering, and pagination.</p>

- No dependencies
- TypeScript
- Supports SvelteKit, SSR, Svelte 5

## Installation

```bash
npm install @careswitch/svelte-data-table
```

## Usage

```svelte
<script lang="ts">
	import { DataTable } from '@careswitch/svelte-data-table';

	const table = new DataTable({
		data: [
			{ id: 1, name: 'John Doe', status: 'active' },
			{ id: 2, name: 'Jane Doe', status: 'inactive' }
		],
		columns: [
			{ key: 'id', name: 'ID' },
			{ key: 'name', name: 'Name' },
			{ key: 'status', name: 'Status', sortable: false }
		]
	});
</script>
```
