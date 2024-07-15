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

		it('should handle empty data set', () => {
			const table = new DataTable({ data: [], columns });
			expect(table.rows).toHaveLength(0);
			expect(table.totalPages).toBe(1);
		});

		it('should handle data with missing properties', () => {
			const incompleteData = [
				{ id: 1, name: 'Alice' },
				{ id: 2, age: 25 }
			];
			const table = new DataTable({ data: incompleteData, columns });
			expect(table.rows).toHaveLength(2);
			expect(table.rows[0].age).toBeUndefined();
			expect(table.rows[1].name).toBeUndefined();
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

		it('should handle sorting with custom sorter function', () => {
			const customColumns = columns.map((col) =>
				col.key === 'name'
					? {
							...col,
							sorter: (a, b) => b.name.localeCompare(a.name) // Reverse alphabetical order
						}
					: col
			) satisfies ColumnDef<(typeof sampleData)[0]>[];
			const table = new DataTable({ data: sampleData, columns: customColumns });
			table.toggleSort('name');
			expect(table.rows[0].name).toBe('Eve');
			expect(table.rows[4].name).toBe('Alice');
		});

		it('should maintain sort state when applying filters', () => {
			const table = new DataTable({ data: sampleData, columns });
			table.toggleSort('age');
			table.setFilter('name', ['Alice', 'Bob', 'Charlie']);
			expect(table.rows[0].name).toBe('Bob');
			expect(table.rows[2].name).toBe('Charlie');
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

		it('should handle case-insensitive global filter', () => {
			const table = new DataTable({ data: sampleData, columns });
			table.globalFilter = 'ALICE';
			expect(table.rows).toHaveLength(1);
			expect(table.rows[0].name).toBe('Alice');
		});

		it('should handle special characters in global filter', () => {
			const specialData = [
				{ id: 1, name: 'John (Manager)', age: 40 },
				{ id: 2, name: 'Jane [HR]', age: 35 }
			];
			const table = new DataTable({ data: specialData, columns });
			table.globalFilter = '(Manager)';
			expect(table.rows).toHaveLength(1);
			expect(table.rows[0].name).toBe('John (Manager)');
		});

		it('should handle custom filter function', () => {
			const customColumns = columns.map((col) =>
				col.key === 'age'
					? {
							...col,
							filter: (value, filterValue) => value >= filterValue
						}
					: col
			) satisfies ColumnDef<(typeof sampleData)[0]>[];
			const table = new DataTable({ data: sampleData, columns: customColumns });
			table.setFilter('age', [30]);
			expect(table.rows).toHaveLength(3);
			expect(table.rows.every((row) => row.age >= 30)).toBe(true);
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

		it('should adjust current page when filters reduce total pages', () => {
			const table = new DataTable({ data: sampleData, columns, pageSize: 2 });
			table.currentPage = 3;
			table.setFilter('age', [30, 32]);
			expect(table.currentPage).toBe(1);
			expect(table.totalPages).toBe(1);
		});

		it('should handle page size larger than data set', () => {
			const table = new DataTable({ data: sampleData, columns, pageSize: 10 });
			expect(table.rows).toHaveLength(5);
			expect(table.totalPages).toBe(1);
		});
	});

	describe('Edge Cases', () => {
		it('should handle repeated toggling of sort', () => {
			const table = new DataTable({ data: sampleData, columns });
			for (let i = 0; i < 10; i++) {
				table.toggleSort('age');
			}
			// After 10 toggles, we should be back to 'asc'
			expect(table.getSortState('age')).toBe('asc');
		});

		it('should handle multiple rapid filter changes', () => {
			const table = new DataTable({ data: sampleData, columns });
			table.setFilter('age', [30]);
			table.setFilter('name', ['Alice']);
			table.clearFilter('age');
			table.toggleFilter('name', 'Bob');
			expect(table.rows).toHaveLength(2);
			expect(table.rows.every((row) => row.name === 'Alice' || row.name === 'Bob')).toBe(true);
		});

		it('should handle sorting on column with all null values', () => {
			const nullData = [
				{ id: 1, name: 'Alice', age: null },
				{ id: 2, name: 'Bob', age: null },
				{ id: 3, name: 'Charlie', age: null }
			];
			const table = new DataTable({ data: nullData, columns });
			table.toggleSort('age');
			expect(table.rows).toHaveLength(3);
			// The order should remain unchanged
			expect(table.rows[0].name).toBe('Alice');
			expect(table.rows[2].name).toBe('Charlie');
		});
	});
});
