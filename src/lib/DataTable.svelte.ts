type ValueGetter<T, V> = (row: T) => V;
type Sorter<T> = (a: T, b: T) => number;
type Filter<T, V> = (value: V, filterValue: V, row: T) => boolean;

export interface ColumnDef<T, V = any> {
	key: keyof T;
	name: string;
	sortable?: boolean;
	getValue?: ValueGetter<T, V>;
	sorter?: Sorter<T>;
	filter?: Filter<T, V>;
}

type SortDirection = 'asc' | 'desc' | null;

type TableConfig<T> = {
	data: T[];
	columns: ColumnDef<T>[];
	pageSize?: number;
	initialSort?: keyof T;
	initialSortDirection?: SortDirection;
	initialFilters?: { [K in keyof T]?: any[] };
};

/**
 * Represents a data table with sorting, filtering, and pagination capabilities.
 * @template T The type of data items in the table.
 */
export class DataTable<T> {
	#originalData = $state<T[]>([]);
	#columns = $state<ColumnDef<T>[]>([]);
	#pageSize = $state(10);
	#currentPage = $state(1);
	#sortState = $state<{ column: keyof T | null; direction: SortDirection }>({
		column: null,
		direction: null
	});
	#filterState = $state<{ [K in keyof T]: Set<any> }>({} as any);
	#globalFilter = $state<string>('');
	#globalFilterRegex = $state<RegExp | null>(null);

	#isFilterDirty = $state(true);
	#isSortDirty = $state(true);

	#filteredData: T[] = [];
	#sortedData: T[] = [];

	/**
	 * Creates a new DataTable instance.
	 * @param {TableConfig<T>} config - The configuration object for the data table.
	 */
	constructor(config: TableConfig<T>) {
		this.#originalData = [...config.data];
		this.#columns = config.columns;
		this.#pageSize = config.pageSize || 10;
		if (config.initialSort) {
			this.#sortState = {
				column: config.initialSort,
				direction: config.initialSortDirection || 'asc'
			};
		}
		this.#initializeFilterState(config.initialFilters);
	}

	#initializeFilterState(initialFilters?: { [K in keyof T]?: any[] }) {
		this.#columns.forEach((column) => {
			const initialFilterValues = initialFilters?.[column.key];
			if (initialFilterValues) {
				this.#filterState[column.key] = new Set(initialFilterValues);
			} else {
				this.#filterState[column.key] = new Set();
			}
		});
	}

	#getColumnDef(key: keyof T): ColumnDef<T> | undefined {
		return this.#columns.find((col) => col.key === key);
	}

	#getValue<K extends keyof T>(row: T, key: K): T[K] | any {
		const colDef = this.#getColumnDef(key);
		return colDef && colDef.getValue ? colDef.getValue(row) : row[key];
	}

	#matchesGlobalFilter = (row: T): boolean => {
		if (!this.#globalFilterRegex) return true;

		return this.#columns.some((col) => {
			const value = this.#getValue(row, col.key);
			return typeof value === 'string' && this.#globalFilterRegex!.test(value);
		});
	};

	#matchesFilters = (row: T): boolean => {
		return (Object.keys(this.#filterState) as Array<keyof T>).every((key) => {
			const filterSet = this.#filterState[key];
			if (!filterSet || filterSet.size === 0) return true;

			const colDef = this.#getColumnDef(key);
			const value = this.#getValue(row, key);

			if (colDef && colDef.filter) {
				return Array.from(filterSet).some((filterValue) => colDef.filter!(value, filterValue, row));
			}

			return filterSet.has(value);
		});
	};

	#applyFilters() {
		if (!this.#isFilterDirty) return;

		this.#filteredData = this.#originalData.filter(
			(row) => this.#matchesGlobalFilter(row) && this.#matchesFilters(row)
		);
		this.#isFilterDirty = false;
		this.#isSortDirty = true;
	}

	#applySort() {
		if (!this.#isSortDirty) return;

		const { column, direction } = this.#sortState;
		if (column && direction) {
			const colDef = this.#getColumnDef(column);
			this.#sortedData = [...this.#filteredData].sort((a, b) => {
				if (colDef && colDef.sorter) {
					return direction === 'asc' ? colDef.sorter(a, b) : colDef.sorter(b, a);
				}
				const aVal = this.#getValue(a, column);
				const bVal = this.#getValue(b, column);
				if (aVal < bVal) return direction === 'asc' ? -1 : 1;
				if (aVal > bVal) return direction === 'asc' ? 1 : -1;
				return 0;
			});
		} else {
			this.#sortedData = [...this.#filteredData];
		}
		this.#isSortDirty = false;
	}

	/**
	 * Gets or sets the base data rows without any filtering or sorting applied.
	 * @returns {T[]} An array of all rows.
	 */
	get baseRows() {
		return this.#originalData;
	}

	/**
	 * @param {T[]} rows - The array of rows to reset the base data to.
	 */
	set baseRows(rows: T[]) {
		this.#originalData = [...rows];
		this.#currentPage = 1;
		this.#isFilterDirty = true;
	}

	/**
	 * The current page of rows based on applied filters and sorting.
	 * @returns {T[]} An array of rows for the current page.
	 */
	get rows() {
		this.#applyFilters();
		this.#applySort();
		const startIndex = (this.currentPage - 1) * this.#pageSize;
		const endIndex = startIndex + this.#pageSize;
		return this.#sortedData.slice(startIndex, endIndex);
	}

	/**
	 * The column definitions for the table.
	 * @returns {ColumnDef<T>[]} An array of column definitions.
	 */
	get columns() {
		return this.#columns;
	}

	/**
	 * The current filter state for all columns.
	 * @returns {{ [K in keyof T]: Set<any> }} An object representing the filter state that maps column keys to filter values.
	 */
	get filters() {
		return this.#filterState;
	}

	/**
	 * The total number of pages based on the current filters and page size.
	 * @returns {number} The total number of pages.
	 */
	get totalPages() {
		this.#applyFilters();
		return Math.max(1, Math.ceil(this.#filteredData.length / this.#pageSize));
	}

	/**
	 * Gets or sets the current page number.
	 * @returns {number} The current page number.
	 */
	get currentPage() {
		return this.#currentPage;
	}

	/**
	 * @param {number} page - The page number to set.
	 */
	set currentPage(page: number) {
		this.#currentPage = Math.max(1, Math.min(page, this.totalPages));
	}

	/**
	 * Indicates whether the user can navigate to the previous page.
	 * @returns {boolean} True if there's a previous page available, false otherwise.
	 */
	get canGoBack() {
		return this.currentPage > 1 && this.#filteredData.length > 0;
	}

	/**
	 * Indicates whether the user can navigate to the next page.
	 * @returns {boolean} True if there's a next page available, false otherwise.
	 */
	get canGoForward() {
		return this.currentPage < this.totalPages && this.#filteredData.length > 0;
	}

	/**
	 * Gets or sets the global filter string.
	 * @returns {string} The current global filter string.
	 */
	get globalFilter() {
		return this.#globalFilter;
	}

	/**
	 * @param {string} value - The global filter string to set.
	 */
	set globalFilter(value: string) {
		this.#globalFilter = value;
		this.#globalFilterRegex = value.trim() !== '' ? new RegExp(value, 'i') : null;
		this.#currentPage = 1;
		this.#isFilterDirty = true;
	}

	/**
	 * Toggles the sort state for a given column.
	 * @param {keyof T} column - The key of the column to toggle sorting for.
	 */
	toggleSort = (column: keyof T) => {
		const colDef = this.#getColumnDef(column);
		if (!colDef || colDef.sortable === false) return;

		this.#isSortDirty = true;
		if (this.#sortState.column === column) {
			this.#sortState = {
				column,
				direction:
					this.#sortState.direction === 'asc'
						? 'desc'
						: this.#sortState.direction === 'desc'
							? null
							: 'asc'
			};
		} else {
			this.#sortState = { column, direction: 'asc' };
		}
	};

	/**
	 * Gets the current sort state for a given column.
	 * @param {keyof T} column - The key of the column to get the sort state for.
	 * @returns {SortDirection} The current sort direction for the column.
	 */
	getSortState = (column: keyof T): SortDirection => {
		return this.#sortState.column === column ? this.#sortState.direction : null;
	};

	/**
	 * Checks if a column is sortable.
	 * @param {keyof T} column - The key of the column to check.
	 * @returns {boolean} True if the column is sortable, false otherwise.
	 */
	isSortable = (column: keyof T): boolean => {
		const colDef = this.#getColumnDef(column);
		return colDef?.sortable !== false;
	};

	/**
	 * Sets the filter for a specific column.
	 * @param {K} column - The key of the column to set the filter for.
	 * @param {any[]} values - The values to set as the filter.
	 * @template K
	 */
	setFilter = <K extends keyof T>(column: K, values: any[]) => {
		this.#isFilterDirty = true;
		this.#filterState[column] = new Set(values);
		this.#currentPage = 1;
	};

	/**
	 * Clears the filter for a specific column.
	 * @param {keyof T} column - The key of the column to clear the filter for.
	 */
	clearFilter = (column: keyof T) => {
		this.#isFilterDirty = true;
		this.#filterState[column] = new Set();
		this.#currentPage = 1;
	};

	/**
	 * Toggles a filter value for a specific column.
	 * @param {K} column - The key of the column to toggle the filter for.
	 * @param {any} value - The value to toggle in the filter.
	 * @template K
	 */
	toggleFilter = <K extends keyof T>(column: K, value: any) => {
		this.#isFilterDirty = true;
		const currentFilter = this.#filterState[column];

		if (currentFilter.has(value)) {
			currentFilter.delete(value);
		} else {
			currentFilter.add(value);
		}

		this.#filterState[column] = new Set(currentFilter);
		this.#currentPage = 1;
	};

	/**
	 * Checks if a specific filter value is active for a column.
	 * @param {K} column - The key of the column to check the filter for.
	 * @param {any} value - The value to check in the filter.
	 * @returns {boolean} True if the filter is active for the given value, false otherwise.
	 * @template K
	 */
	isFilterActive = <K extends keyof T>(column: K, value: any): boolean => {
		return this.#filterState[column].has(value);
	};
}
