<img align="center" alt="Svelte Data Table Screenshot" src="https://github.com/user-attachments/assets/fc527332-882b-463a-b070-d4714b32ec47">

---

- No dependencies
- Blazing fast thanks to Svelte 5 and fine-grained reactivity
- Fully typed with TypeScript
- Comprehensive unit tests
- Supports SvelteKit and SSR
- Works great with shadcn [data table](https://www.shadcn-svelte.com/docs/components/data-table)

## Demo

**[Demo Website](https://careswitch-svelte-data-table.vercel.app)**

## Installation

```bash
npm install @careswitch/svelte-data-table
```

_Requires Svelte 5 peer dependency_

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
			{ key: 'status', name: 'Status' }
		]
	});
</script>

<table>
	<thead>
		<tr>
			{#each table.columns as column (column.key)}
				<th>{column.name}</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each table.rows as row (row.id)}
			<tr>
				{#each table.columns as column (column.key)}
					<td>{row[column.key]}</td>
				{/each}
			</tr>
		{/each}
	</tbody>
</table>
```

## Examples

Reference the demo website [+page.svelte](./src/routes/+page.svelte) for a more comprehensive example.
