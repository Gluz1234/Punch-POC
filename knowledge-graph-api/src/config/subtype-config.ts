/**
 * Code-defined Promotion Subtypes Configuration
 *
 * These subtypes are automatically registered in Neo4j on app startup.
 * Each subtype extends "Person" with a set of properties.
 *
 * Format:
 *  key:        Unique identifier (e.g., "student")
 *  label:      Neo4j label (e.g., "Student")
 *  baseLabel:  Parent label (e.g., "Person")
 *  properties: Array of property names in snake_case (e.g., ["student_id", "gpa"])
 */

export interface SubtypeDefinition {
  key: string;
  label: string;
  baseLabel: string;
  properties: string[];
  icon: string;
  /** Base type labels this subtype is allowed to be applied to. Universal per subtype. */
  allowedBaseLabels: string[];
  /** Explicit type per property name (STRING / INTEGER / FLOAT / BOOLEAN / DATE). Defaults to STRING. */
  propertyTypes?: Record<string, string>;
}

export const BUILTIN_SUBTYPES: SubtypeDefinition[] = [
  {
    key: 'student',
    label: 'Student',
    baseLabel: 'Person',
    icon: '📝',
    allowedBaseLabels: ['Person'],
    properties: ['student_id', 'gpa', 'enrollment_year', 'enrollment_status', 'study_mode'],
    propertyTypes: {
      student_id: 'STRING',
      gpa: 'FLOAT',
      enrollment_year: 'INTEGER',
      enrollment_status: 'STRING',
      study_mode: 'STRING',
    },
  },

  {
    key: 'employee',
    label: 'Employee',
    baseLabel: 'Person',
    icon: '💼',
    allowedBaseLabels: ['Person'],
    properties: ['employee_number', 'contract_type', 'salary_band', 'department', 'hire_date'],
    propertyTypes: {
      employee_number: 'STRING',
      contract_type: 'STRING',
      salary_band: 'STRING',
      department: 'STRING',
      hire_date: 'DATE',
    },
  },

  {
    key: 'resident',
    label: 'Resident',
    baseLabel: 'Person',
    icon: '🏠',
    allowedBaseLabels: ['Person'],
    properties: ['resident_id', 'registration_date', 'residency_type', 'marital_status'],
    propertyTypes: {
      resident_id: 'STRING',
      registration_date: 'DATE',
      residency_type: 'STRING',
      marital_status: 'STRING',
    },
  },

  {
    key: 'researcher',
    label: 'Researcher',
    baseLabel: 'Person',
    icon: '🔬',
    allowedBaseLabels: ['Person'],
    properties: ['orcid_id', 'research_field', 'h_index', 'researcher_type'],
    propertyTypes: {
      orcid_id: 'STRING',
      research_field: 'STRING',
      h_index: 'INTEGER',
      researcher_type: 'STRING',
    },
  },

  {
    key: 'artist',
    label: 'Artist',
    baseLabel: 'Person',
    icon: '🎨',
    allowedBaseLabels: ['Person'],
    properties: ['artist_id', 'primary_medium', 'years_active_start', 'years_active_end', 'style'],
    propertyTypes: {
      artist_id: 'STRING',
      primary_medium: 'STRING',
      years_active_start: 'INTEGER',
      years_active_end: 'INTEGER',
      style: 'STRING',
    },
  },
];

/**
 * Returns the subtype definition for a given label, or undefined if not found.
 */
export function getSubtypeDefinition(label: string): SubtypeDefinition | undefined {
  return BUILTIN_SUBTYPES.find(
    (st) => st.label.toLowerCase() === label.toLowerCase()
  );
}

/**
 * Returns the subtype definition for a given key, or undefined if not found.
 */
export function getSubtypeDefinitionByKey(key: string): SubtypeDefinition | undefined {
  return BUILTIN_SUBTYPES.find(
    (st) => st.key.toLowerCase() === key.toLowerCase()
  );
}
