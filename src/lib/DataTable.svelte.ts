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

export class DataTable<T> {
	#rawData = $state<T[]>([]);
	#columns = $state<ColumnDef<T>[]>([]);
	#pageSize = $state(10);
	#currentPage = $state(1);
	#sortState = $state<{ column: keyof T | null; direction: SortDirection }>({
		column: null,
		direction: null
	});
	#filterState = $state<{ [K in keyof T]: Set<any> }>({} as any);
	#globalFilter = $state<string>('');

	constructor(config: TableConfig<T>) {
		this.#rawData = config.data;
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
		if (!this.#globalFilter.trim()) return true;
		const regex = new RegExp(this.#globalFilter, 'i');

		return this.#columns.some((col) => {
			const value = this.#getValue(row, col.key);
			return typeof value === 'string' && regex.test(value);
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

	get #filteredData() {
		return this.#rawData.filter(
			(row) => this.#matchesGlobalFilter(row) && this.#matchesFilters(row)
		);
	}

	get #sortedAndFilteredData() {
		let data = this.#filteredData;

		if (this.#sortState.column && this.#sortState.direction) {
			data = data.toSorted((a, b) => {
				const colDef = this.#getColumnDef(this.#sortState.column!);
				if (colDef && colDef.sorter) {
					return this.#sortState.direction === 'asc' ? colDef.sorter(a, b) : colDef.sorter(b, a);
				}
				const aVal = this.#getValue(a, this.#sortState.column!);
				const bVal = this.#getValue(b, this.#sortState.column!);
				if (aVal < bVal) return this.#sortState.direction === 'asc' ? -1 : 1;
				if (aVal > bVal) return this.#sortState.direction === 'asc' ? 1 : -1;
				return 0;
			});
		} else {
			data = data.toSorted((a, b) => {
				return this.#rawData.indexOf(a) - this.#rawData.indexOf(b);
			});
		}

		return data;
	}

	get #isEmpty() {
		return this.#filteredData.length === 0;
	}

	get rows() {
		return this.#sortedAndFilteredData.slice(
			(this.currentPage - 1) * this.#pageSize,
			this.currentPage * this.#pageSize
		);
	}

	get columns() {
		return this.#columns;
	}

	get filters() {
		return this.#filterState;
	}

	get totalPages() {
		return Math.max(1, Math.ceil(this.#filteredData.length / this.#pageSize));
	}

	get currentPage() {
		return this.#currentPage;
	}

	set currentPage(page: number) {
		this.#currentPage = Math.max(1, Math.min(page, this.totalPages));
	}

	get canGoBack() {
		return this.currentPage > 1 && !this.#isEmpty;
	}

	get canGoForward() {
		return this.currentPage < this.totalPages && !this.#isEmpty;
	}

	get globalFilter() {
		return this.#globalFilter;
	}

	set globalFilter(value: string) {
		this.#globalFilter = value;
		this.#currentPage = 1;
	}

	toggleSort = (column: keyof T) => {
		const colDef = this.#getColumnDef(column);
		if (!colDef || colDef.sortable === false) return;

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

	getSortState = (column: keyof T): SortDirection => {
		return this.#sortState.column === column ? this.#sortState.direction : null;
	};

	isSortable = (column: keyof T): boolean => {
		const colDef = this.#getColumnDef(column);
		return colDef?.sortable !== false;
	};

	setFilter = <K extends keyof T>(column: K, values: any[]) => {
		this.#filterState[column] = new Set(values);
		this.#currentPage = 1;
	};

	clearFilter = (column: keyof T) => {
		this.#filterState[column] = new Set();
		this.#currentPage = 1;
	};

	toggleFilter = <K extends keyof T>(column: K, value: any) => {
		const currentFilter = this.#filterState[column];

		if (currentFilter.has(value)) {
			currentFilter.delete(value);
		} else {
			currentFilter.add(value);
		}

		this.#filterState[column] = new Set(currentFilter);
		this.#currentPage = 1;
	};

	isFilterActive = <K extends keyof T>(column: K, value: any): boolean => {
		return this.#filterState[column].has(value);
	};
}
