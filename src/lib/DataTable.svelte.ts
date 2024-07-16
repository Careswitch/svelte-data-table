type ValueGetter<T, V> = (row: T) => V;
type Sorter<T> = (a: T, b: T) => number;
type Filter<T, V> = (value: V, filterValue: V, row: T) => boolean;

export interface ColumnDef<T, V = any> {
	id: string;
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
	initialSort?: string;
	initialSortDirection?: SortDirection;
	initialFilters?: { [id: string]: any[] };
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
	#sortState = $state<{ columnId: string | null; direction: SortDirection }>({
		columnId: null,
		direction: null
	});
	#filterState = $state<{ [id: string]: Set<any> }>({});
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
				columnId: config.initialSort,
				direction: config.initialSortDirection || 'asc'
			};
		}
		this.#initializeFilterState(config.initialFilters);
	}

	#initializeFilterState(initialFilters?: { [id: string]: any[] }) {
		this.#columns.forEach((column) => {
			const initialFilterValues = initialFilters?.[column.id];
			if (initialFilterValues) {
				this.#filterState[column.id] = new Set(initialFilterValues);
			} else {
				this.#filterState[column.id] = new Set();
			}
		});
	}

	#getColumnDef(id: string): ColumnDef<T> | undefined {
		return this.#columns.find((col) => col.id === id);
	}

	#getValue(row: T, columnId: string): any {
		const colDef = this.#getColumnDef(columnId);
		if (!colDef) return undefined;
		return colDef.getValue ? colDef.getValue(row) : row[colDef.key];
	}

	#matchesGlobalFilter = (row: T): boolean => {
		if (!this.#globalFilterRegex) return true;

		return this.#columns.some((col) => {
			const value = this.#getValue(row, col.id);
			return typeof value === 'string' && this.#globalFilterRegex!.test(value);
		});
	};

	#matchesFilters = (row: T): boolean => {
		return Object.keys(this.#filterState).every((columnId) => {
			const filterSet = this.#filterState[columnId];
			if (!filterSet || filterSet.size === 0) return true;

			const colDef = this.#getColumnDef(columnId);
			if (!colDef) return true;

			const value = this.#getValue(row, columnId);

			if (colDef.filter) {
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

		const { columnId, direction } = this.#sortState;
		if (columnId && direction) {
			const colDef = this.#getColumnDef(columnId);
			this.#sortedData = [...this.#filteredData].sort((a, b) => {
				if (colDef && colDef.sorter) {
					return direction === 'asc' ? colDef.sorter(a, b) : colDef.sorter(b, a);
				}
				const aVal = this.#getValue(a, columnId);
				const bVal = this.#getValue(b, columnId);
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
	get filterState() {
		return this.#filterState;
	}

	/**
	 * The current sort state for the table.
	 * @returns {{ column: keyof T | null; direction: SortDirection }} An object representing the sort state with a column key and direction.
	 */
	get sortState() {
		return this.#sortState;
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
	 * Toggles the sort direction for the specified column.
	 * @param {string} columnId - The column id to toggle sorting for.
	 */
	toggleSort = (columnId: string) => {
		const colDef = this.#getColumnDef(columnId);
		if (!colDef || colDef.sortable === false) return;

		this.#isSortDirty = true;
		if (this.#sortState.columnId === columnId) {
			this.#sortState = {
				columnId,
				direction:
					this.#sortState.direction === 'asc'
						? 'desc'
						: this.#sortState.direction === 'desc'
							? null
							: 'asc'
			};
		} else {
			this.#sortState = { columnId, direction: 'asc' };
		}
	};

	/**
	 * Gets the current sort state for the specified column.
	 * @param {string} columnId - The column id to get the sort state for.
	 */
	getSortState = (columnId: string): SortDirection => {
		return this.#sortState.columnId === columnId ? this.#sortState.direction : null;
	};

	/**
	 * Indicates whether the specified column is sortable.
	 * @param {string} columnId - The column id to check.
	 */
	isSortable = (columnId: string): boolean => {
		const colDef = this.#getColumnDef(columnId);
		return colDef?.sortable !== false;
	};

	/**
	 * Sets the filter values for the specified column.
	 * @param {string} columnId - The column id to set the filter values for.
	 * @param {any[]} values - The filter values to set.
	 */
	setFilter = (columnId: string, values: any[]) => {
		this.#isFilterDirty = true;
		this.#filterState = { ...this.#filterState, [columnId]: new Set(values) };
		this.#currentPage = 1;
	};

	/**
	 * Clears the filter values for the specified column.
	 * @param {string} columnId - The column id to clear the filter values for.
	 */
	clearFilter = (columnId: string) => {
		this.#isFilterDirty = true;
		this.#filterState = { ...this.#filterState, [columnId]: new Set() };
		this.#currentPage = 1;
	};

	/**
	 * Toggles the filter value for the specified column.
	 * @param {string} columnId - The column id to toggle the filter value for.
	 * @param {any} value - The filter value to toggle.
	 */
	toggleFilter = (columnId: string, value: any) => {
		this.#isFilterDirty = true;
		this.#filterState = {
			...this.#filterState,
			[columnId]: this.isFilterActive(columnId, value)
				? new Set([...this.#filterState[columnId]].filter((v) => v !== value))
				: new Set([...this.#filterState[columnId], value])
		};

		this.#currentPage = 1;
	};

	/**
	 * Indicates whether the specified filter value is active for the specified column.
	 * @param {string} columnId - The column id to check.
	 * @param {any} value - The filter value to check.
	 */
	isFilterActive = (columnId: string, value: any): boolean => {
		return this.#filterState[columnId].has(value);
	};
}
