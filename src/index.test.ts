import { describe, it, expect } from 'vitest';
import { DataTable, type ColumnDef } from '$lib/DataTable.svelte.js';

describe('DataTable', () => {
	const sampleData = [
		{ id: 1, name: 'Alice', age: 30 },
		{ id: 2, name: 'Bob', age: 25 },
		{ id: 3, name: 'Charlie', age: 35 },
		{ id: 4, name: 'David', age: 28 },
		{ id: 5, name: 'Eve', age: 32 }
	];

	const columns = [
		{ key: 'id', name: 'ID', sortable: true },
		{ key: 'name', name: 'Name', sortable: true },
		{ key: 'age', name: 'Age', sortable: true }
	] satisfies ColumnDef<(typeof sampleData)[0]>[];

	describe('Initialization', () => {
		it('should initialize with default settings', () => {
			const table = new DataTable({ data: sampleData, columns });
			expect(table.rows).toHaveLength(5);
			expect(table.currentPage).toBe(1);
			expect(table.totalPages).toBe(1);
		});

		it('should initialize with custom page size', () => {
			const table = new DataTable({ data: sampleData, columns, pageSize: 2 });
			expect(table.rows).toHaveLength(2);
			expect(table.totalPages).toBe(3);
		});

		it('should initialize with initial sort', () => {
			const table = new DataTable({
				data: sampleData,
				columns,
				initialSort: 'age',
				initialSortDirection: 'desc'
			});
			expect(table.rows[0].age).toBe(35);
		});

		it('should initialize with initial filters', () => {
			const table = new DataTable({
				data: sampleData,
				columns,
				initialFilters: { age: [30, 35] }
			});
			expect(table.rows).toHaveLength(2);
			expect(table.rows.every((row) => row.age === 30 || row.age === 35)).toBe(true);
		});
	});

	describe('Sorting', () => {
		it('should sort ascending', () => {
			const table = new DataTable({ data: sampleData, columns });
			table.toggleSort('age');
			expect(table.rows[0].age).toBe(25);
			expect(table.rows[4].age).toBe(35);
		});

		it('should sort descending', () => {
			const table = new DataTable({ data: sampleData, columns });
			table.toggleSort('age');
			table.toggleSort('age');
			expect(table.rows[0].age).toBe(35);
			expect(table.rows[4].age).toBe(25);
		});

		it('should clear sort', () => {
			const table = new DataTable({ data: sampleData, columns });
			table.toggleSort('age');
			table.toggleSort('age');
			table.toggleSort('age');
			expect(table.getSortState('age')).toBeNull();
		});

		it('should not sort unsortable columns', () => {
			const unsortableColumns = columns.map((col) => ({ ...col, sortable: false }));
			const table = new DataTable({ data: sampleData, columns: unsortableColumns });
			table.toggleSort('age');
			expect(table.getSortState('age')).toBeNull();
		});
	});

	describe('Filtering', () => {
		it('should apply single column filter', () => {
			const table = new DataTable({ data: sampleData, columns });
			table.setFilter('age', [30, 35]);
			expect(table.rows).toHaveLength(2);
			expect(table.rows.every((row) => row.age === 30 || row.age === 35)).toBe(true);
		});

		it('should apply multiple column filters', () => {
			const table = new DataTable({ data: sampleData, columns });
			table.setFilter('age', [30, 35]);
			table.setFilter('name', ['Alice', 'Charlie']);
			expect(table.rows).toHaveLength(2);
			expect(
				table.rows.every(
					(row) =>
						(row.age === 30 || row.age === 35) && (row.name === 'Alice' || row.name === 'Charlie')
				)
			).toBe(true);
		});

		it('should clear filter', () => {
			const table = new DataTable({ data: sampleData, columns });
			table.setFilter('age', [30]);
			table.clearFilter('age');
			expect(table.rows).toHaveLength(5);
		});

		it('should toggle filter value', () => {
			const table = new DataTable({ data: sampleData, columns });
			table.toggleFilter('age', 30);
			expect(table.rows).toHaveLength(1);
			table.toggleFilter('age', 30);
			expect(table.rows).toHaveLength(5);
		});

		it('should apply global filter', () => {
			const table = new DataTable({ data: sampleData, columns });
			table.globalFilter = 'ali';
			expect(table.rows).toHaveLength(1);
			expect(table.rows[0].name).toBe('Alice');
		});
	});

	describe('Pagination', () => {
		it('should paginate correctly', () => {
			const table = new DataTable({ data: sampleData, columns, pageSize: 2 });
			expect(table.rows).toHaveLength(2);
			expect(table.totalPages).toBe(3);
		});

		it('should change current page', () => {
			const table = new DataTable({ data: sampleData, columns, pageSize: 2 });
			table.currentPage = 2;
			expect(table.currentPage).toBe(2);
			expect(table.rows[0].id).toBe(3);
		});

		it('should not exceed total pages', () => {
			const table = new DataTable({ data: sampleData, columns, pageSize: 2 });
			table.currentPage = 10;
			expect(table.currentPage).toBe(3);
		});

		it('should handle empty result set', () => {
			const table = new DataTable({ data: sampleData, columns });
			table.setFilter('age', [100]);
			expect(table.rows).toHaveLength(0);
			expect(table.totalPages).toBe(1);
			expect(table.currentPage).toBe(1);
		});
	});
});
