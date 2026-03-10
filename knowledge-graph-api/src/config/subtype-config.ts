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
}

export const BUILTIN_SUBTYPES: SubtypeDefinition[] = [
  {
    key: 'student',
    label: 'Student',
    baseLabel: 'Person',
    icon: '📝',
    properties: [
      'student_id',
      'gpa',
      'enrollment_year',
      'enrollment_status',
      'study_mode',
    ],
  },

  {
    key: 'employee',
    label: 'Employee',
    baseLabel: 'Person',
    icon: '💼',
    properties: [
      'employee_number',
      'contract_type',
      'salary_band',
      'department',
      'hire_date',
    ],
  },

  {
    key: 'resident',
    label: 'Resident',
    baseLabel: 'Person',
    icon: '🏠',
    properties: [
      'resident_id',
      'registration_date',
      'residency_type',
      'marital_status',
    ],
  },

  {
    key: 'researcher',
    label: 'Researcher',
    baseLabel: 'Person',
    icon: '🔬',
    properties: [
      'orcid_id',
      'research_field',
      'h_index',
      'researcher_type',
    ],
  },

  {
    key: 'artist',
    label: 'Artist',
    baseLabel: 'Person',
    icon: '🎨',
    properties: [
      'artist_id',
      'primary_medium',
      'years_active_start',
      'years_active_end',
      'style',
    ],
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
