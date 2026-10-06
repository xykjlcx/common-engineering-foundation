import { booleanFilterContract } from '../../kernel/boolean-filter-contract.js';

export const { rootSchema, jsonSchema, resolve } = booleanFilterContract('enabled', 'true', 'false');
