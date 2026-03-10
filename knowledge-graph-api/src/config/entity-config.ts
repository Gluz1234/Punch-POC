/**
 * Entity Configuration System
 * Defines all domain entities with their Neo4j labels, ID fields, and properties.
 * This single source of truth eliminates code duplication.
 */

export interface EntityConfig {
  /** Key used in routes and module registration */
  key: string;
  
  /** Neo4j label (e.g., "Person", "Course") */
  label: string;
  
  /** Canonical ID field name (shared across all entity types) */
  idField: string;

  /** Optional legacy ID field aliases accepted during migration */
  legacyIdFields?: string[];
  
  /** Display name for error messages */
  displayName: string;
  
  /** API route (e.g., "/persons", "/courses") */
  route: string;
  
  /** Properties for this entity */
  properties: Record<string, string>; // key -> description for now
  
  /** Property types for type validation and schema info */
  propertyTypes?: Record<string, string>; // key -> type (String, Integer, etc.)
  
  /** Special query filters (optional) */
  specialQueries?: {
    name: string;
    paramName: string;
    cypherParam: string;
  }[];
}

/**
 * Central entity registry.
 * Add new entity types here without touching a single controller/service.
 */
export const ENTITY_CONFIGS: Record<string, EntityConfig> = {
  person: {
    key: 'person',
    label: 'Person',
    idField: 'entity_id',
    legacyIdFields: ['strong_id', 'strongId'],
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
      entity_id: 'String',
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
    idField: 'entity_id',
    legacyIdFields: ['org_id', 'orgId'],
    displayName: 'Organization',
    route: 'organizations',
    properties: {
      name: 'Organization name',
      organization_type: 'Type (University/Company/etc)',
      industry: 'Industry',
    },
    propertyTypes: {
      entity_id: 'String',
      name: 'String',
      organization_type: 'String',
      industry: 'String',
    },
  },
  
  location: {
    key: 'location',
    label: 'Location',
    idField: 'entity_id',
    legacyIdFields: ['location_id', 'locationId'],
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
      entity_id: 'String',
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
    idField: 'entity_id',
    legacyIdFields: ['skill_id', 'skillId'],
    displayName: 'Skill',
    route: 'skills',
    properties: {
      name: 'Skill name',
      category: 'Skill category',
    },
    propertyTypes: {
      entity_id: 'String',
      name: 'String',
      category: 'String',
    },
  },
  
  education: {
    key: 'education',
    label: 'Education',
    idField: 'entity_id',
    legacyIdFields: ['education_id', 'educationId'],
    displayName: 'Education',
    route: 'education',
    properties: {
      title: 'Education title',
      education_type: 'Type (Degree/Certificate)',
      field_of_study: 'Field of study',
    },
    propertyTypes: {
      entity_id: 'String',
      title: 'String',
      education_type: 'String',
      field_of_study: 'String',
    },
  },
  
  course: {
    key: 'course',
    label: 'Course',
    idField: 'entity_id',
    legacyIdFields: ['course_id', 'courseId'],
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
      entity_id: 'String',
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
    idField: 'entity_id',
    legacyIdFields: ['department_id', 'departmentId'],
    displayName: 'Department',
    route: 'departments',
    properties: {
      name: 'Department name',
      code: 'Department code',
      org_id: 'Organization ID',
    },
    propertyTypes: {
      entity_id: 'String',
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

/**
 * Get all registered entity configurations.
 */
export function getAllEntities(): EntityConfig[] {
  return Object.values(ENTITY_CONFIGS);
}

/**
 * Get a specific entity config.
 */
export function getEntityConfig(key: string): EntityConfig {
  const config = ENTITY_CONFIGS[key.toLowerCase()];
  if (!config) {
    throw new Error(`Entity configuration not found: ${key}`);
  }
  return config;
}
