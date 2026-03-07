"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUILTIN_SUBTYPES = void 0;
exports.getSubtypeDefinition = getSubtypeDefinition;
exports.getSubtypeDefinitionByKey = getSubtypeDefinitionByKey;
exports.BUILTIN_SUBTYPES = [
    {
        key: 'student',
        label: 'Student',
        baseLabel: 'Person',
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
        properties: [
            'artist_id',
            'primary_medium',
            'years_active_start',
            'years_active_end',
            'style',
        ],
    },
];
function getSubtypeDefinition(label) {
    return exports.BUILTIN_SUBTYPES.find((st) => st.label.toLowerCase() === label.toLowerCase());
}
function getSubtypeDefinitionByKey(key) {
    return exports.BUILTIN_SUBTYPES.find((st) => st.key.toLowerCase() === key.toLowerCase());
}
//# sourceMappingURL=subtype-config.js.map