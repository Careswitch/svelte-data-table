<script lang="ts">
	import GithubLogo from 'svelte-radix/GithubLogo.svelte';
	import ArrowLeft from 'svelte-radix/ArrowLeft.svelte';
	import ArrowRight from 'svelte-radix/ArrowRight.svelte';

	import { DataTable } from '$lib/DataTable.svelte';

	import * as Table from '$lib/components/ui/table/index.js';
	import * as Menubar from '$lib/components/ui/menubar/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';

	let { data } = $props();

	const table = new DataTable({
		pageSize: 25,
		data: data.users,
		columns: [
			{ key: 'id', name: 'ID' },
			{ key: 'name', name: 'Name' },
			{ key: 'status', name: 'Status', sortable: false }
		]
	});

	const statuses = [
		{ label: 'Active', value: 'active' },
		{ label: 'Inactive', value: 'inactive' }
	];
</script>
<svelte:head>
	<title>Svelte Data Table</title>
</svelte:head>

<div class="mx-auto h-dvh max-w-7xl px-4 sm:px-6 lg:px-8">
	<div class="grid h-full grid-cols-1 grid-rows-[auto,auto,1fr,auto]">
		<div class="flex justify-between gap-4 pb-4 pt-12">
			<div>
				<h1 class="text-4xl font-extrabold tracking-tight lg:text-5xl">Svelte Data Table</h1>
				<p class="text-lg text-muted-foreground">
					Small, fast data table library for Svelte 5 with client-side sorting, filtering, and
					pagination.
				</p>
			</div>
			<Button
				class="shrink-0"
				size="icon"
				variant="ghost"
				href="https://github.com/Careswitch/svelte-data-table"
			>
				<GithubLogo class="size-6" />
			</Button>
		</div>
		<div class="flex flex-col gap-4 py-4 md:flex-row md:items-center md:gap-0 print:hidden">
			<Menubar.Root>
				<Menubar.Menu>
					<Menubar.Trigger>Filter</Menubar.Trigger>
					<Menubar.Content>
						<Menubar.Sub>
							<Menubar.SubTrigger>Status</Menubar.SubTrigger>
							<Menubar.SubContent class="w-40">
								{#each statuses as status}
									<Menubar.CheckboxItem
										checked={table.isFilterActive('status', status.value)}
										onCheckedChange={() => table.toggleFilter('status', status.value)}
									>
										{status.label}
									</Menubar.CheckboxItem>
								{/each}
								<Menubar.Separator />
								<Menubar.Item inset on:click={() => table.clearFilter('status')}>
									Clear
								</Menubar.Item>
							</Menubar.SubContent>
						</Menubar.Sub>
					</Menubar.Content>
				</Menubar.Menu>
			</Menubar.Root>
			<Input
				id="search"
				aria-label="search"
				type="text"
				placeholder="Search"
				class="md:ml-auto md:max-w-[200px]"
				bind:value={table.globalFilter}
			/>
		</div>
		<Table.Root>
			<Table.Header>
				<Table.Row class="sticky top-0 z-10 *:bg-background">
					{#each table.columns as column (column.key)}
						<Table.Head>
							<button
								class="flex items-center"
								onclick={() => table.toggleSort(column.key)}
								disabled={!table.isSortable(column.key)}
							>
								{column.name}
								{#if table.isSortable(column.key)}
									<span class="ml-2">
										{#if table.getSortState(column.key) === 'asc'}
											↑
										{:else if table.getSortState(column.key) === 'desc'}
											↓
										{:else}
											↕
										{/if}
									</span>
								{/if}
							</button>
						</Table.Head>
					{/each}
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each table.rows as row (row.id)}
					<Table.Row>
						{#each table.columns as column (column.key)}
							{#if column.key === 'status'}
								<Table.Cell>
									<Badge variant={row.status === 'active' ? 'secondary' : 'outline'}>
										{row.status === 'active' ? 'Active' : 'Inactive'}
									</Badge>
								</Table.Cell>
							{:else}
								<Table.Cell>{row[column.key]}</Table.Cell>
							{/if}
						{/each}
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
		<div class="flex items-center gap-2 border-t py-2">
			<div class="flex items-center gap-0">
				<Button
					size="icon"
					variant="ghost"
					disabled={!table.canGoBack}
					on:click={() => table.currentPage--}
				>
					<ArrowLeft class="h-5 w-5" />
				</Button>
				<Button
					size="icon"
					variant="ghost"
					disabled={!table.canGoForward}
					on:click={() => table.currentPage++}
				>
					<ArrowRight class="h-5 w-5" />
				</Button>
			</div>
			<p class="text-sm">
				Page <span class="font-semibold">{table.currentPage}</span> of
				<span class="font-semibold">{table.totalPages}</span>
			</p>
		</div>
	</div>
</div>
