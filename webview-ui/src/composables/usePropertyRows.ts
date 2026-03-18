/**
 * usePropertyRows.ts
 *
 * Shared composable for SchemaViewer and SchemaEditor.
 * Manages the "expand-in-table" pattern: each property row can be expanded
 * to reveal its nested schema, which is rendered as a merged row spanning all columns.
 */

import { computed, reactive } from 'vue';
import type { SchemaObject, ReferenceObject } from '@shared/types';

export interface PropertyEntry {
    name: string;
    schema: SchemaObject | ReferenceObject;
}

export interface DisplayRow extends PropertyEntry {
    _expansion?: boolean;
    _origName: string;
}

export function usePropertyRows(
    getProperties: () => Record<string, SchemaObject | ReferenceObject>,
    totalColumns: number = 6,
) {
    const expandedNames = reactive<Record<string, boolean>>({});

    const propertyRows = computed((): DisplayRow[] => {
        const p = getProperties();
        return Object.keys(p).map((name) => ({
            name,
            schema: p[name],
            _origName: name,
        }));
    });

    /**
     * Flattened list of rows: each property row optionally followed by an
     * _expansion row (spanning all columns) when expanded.
     */
    const displayRows = computed(() => {
        const result: any[] = [];
        for (const row of propertyRows.value) {
            result.push(row);
            if (expandedNames[row.name]) {
                result.push({ _expansion: true, name: row.name, schema: row.schema, _origName: row.name });
            }
        }
        return result;
    });

    /** el-table span-method: expansion rows span all columns; normal rows = [1,1]. */
    function spanMethod({ row, columnIndex }: { row: any; columnIndex: number }) {
        if (row._expansion) {
            return columnIndex === 0 ? [1, totalColumns] : [0, 0];
        }
        return [1, 1];
    }

    function toggleExpanded(name: string) {
        expandedNames[name] = !expandedNames[name];
    }

    function setExpanded(name: string, value: boolean) {
        expandedNames[name] = value;
    }

    return { expandedNames, propertyRows, displayRows, spanMethod, toggleExpanded, setExpanded };
}
