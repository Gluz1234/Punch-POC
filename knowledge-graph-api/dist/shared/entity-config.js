"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENTITY_CONFIGS = void 0;
exports.getAllEntities = getAllEntities;
exports.getEntityConfig = getEntityConfig;
exports.ENTITY_CONFIGS = {
    person: {
        key: 'person',
        label: 'Person',
        idField: 'strong_id',
        displayName: 'Person',
        route: 'persons',
        properties: {
            first_name: 'First name',
            last_name: 'Last name',
            email: 'Email address',
            phone: 'Phone number',
            nationality: 'Nationality',
            status: 'Status (Active/Inactive)',
            birth_date: 'Birth date',
        },
        propertyTypes: {
            strong_id: 'String',
            first_name: 'String',
            last_name: 'String',
            email: 'String',
            phone: 'String',
            nationality: 'String',
            status: 'String',
            birth_date: 'Date',
        },
    },
    organization: {
        key: 'organization',
        label: 'Organization',
        idField: 'org_id',
        displayName: 'Organization',
        route: 'organizations',
        properties: {
            name: 'Organization name',
            organization_type: 'Type (University/Company/etc)',
            industry: 'Industry',
        },
        propertyTypes: {
            org_id: 'String',
            name: 'String',
            organization_type: 'String',
            industry: 'String',
        },
    },
    location: {
        key: 'location',
        label: 'Location',
        idField: 'location_id',
        displayName: 'Location',
        route: 'locations',
        properties: {
            name: 'Location name',
            location_type: 'Type (City/Country/etc)',
            latitude: 'Latitude',
            longitude: 'Longitude',
            postal_code: 'Postal code',
            population: 'Population',
        },
        propertyTypes: {
            location_id: 'String',
            name: 'String',
            location_type: 'String',
            latitude: 'Float',
            longitude: 'Float',
            postal_code: 'String',
            population: 'Integer',
        },
    },
    skill: {
        key: 'skill',
        label: 'Skill',
        idField: 'skill_id',
        displayName: 'Skill',
        route: 'skills',
        properties: {
            name: 'Skill name',
            category: 'Skill category',
        },
        propertyTypes: {
            skill_id: 'String',
            name: 'String',
            category: 'String',
        },
    },
    education: {
        key: 'education',
        label: 'Education',
        idField: 'education_id',
        displayName: 'Education',
        route: 'education',
        properties: {
            title: 'Education title',
            education_type: 'Type (Degree/Certificate)',
            field_of_study: 'Field of study',
        },
        propertyTypes: {
            education_id: 'String',
            title: 'String',
            education_type: 'String',
            field_of_study: 'String',
        },
    },
    course: {
        key: 'course',
        label: 'Course',
        idField: 'course_id',
        displayName: 'Course',
        route: 'courses',
        properties: {
            name: 'Course name',
            code: 'Course code',
            credits: 'Credits',
            level: 'Level (Undergraduate/Graduate)',
            academic_term: 'Academic term',
            description: 'Description',
            org_id: 'Organization ID',
        },
        propertyTypes: {
            course_id: 'String',
            name: 'String',
            code: 'String',
            credits: 'Integer',
            level: 'String',
            academic_term: 'String',
            description: 'String',
            org_id: 'String',
        },
        specialQueries: [
            {
                name: 'byOrg',
                paramName: 'orgId',
                cypherParam: 'org_id',
            },
        ],
    },
    department: {
        key: 'department',
        label: 'Department',
        idField: 'department_id',
        displayName: 'Department',
        route: 'departments',
        properties: {
            name: 'Department name',
            code: 'Department code',
            org_id: 'Organization ID',
        },
        propertyTypes: {
            department_id: 'String',
            name: 'String',
            code: 'String',
            org_id: 'String',
        },
        specialQueries: [
            {
                name: 'byOrg',
                paramName: 'orgId',
                cypherParam: 'org_id',
            },
        ],
    },
};
function getAllEntities() {
    return Object.values(exports.ENTITY_CONFIGS);
}
function getEntityConfig(key) {
    const config = exports.ENTITY_CONFIGS[key.toLowerCase()];
    if (!config) {
        throw new Error(`Entity configuration not found: ${key}`);
    }
    return config;
}
//# sourceMappingURL=entity-config.js.map