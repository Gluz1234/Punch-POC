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
  
  /** ID field name in the entity (e.g., "strong_id", "courseId") */
  idField: string;
  
  /** Display name for error messages */
  displayName: string;
  
  /** API route (e.g., "/persons", "/courses") */
  route: string;
  
  /** Properties for this entity */
  properties: Record<string, string>; // key -> description for now
  
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
