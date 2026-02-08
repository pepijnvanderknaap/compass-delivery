/**
 * Centralized Location Configuration
 *
 * This file contains all location-specific metadata and mappings.
 * Use this as the single source of truth for location data across the application.
 */

export interface LocationMetadata {
  slug: string;
  displayName: string;
  logo: string;
  subtitle?: string;
  abbreviation: string;
}

/**
 * All active locations with their metadata
 */
export const LOCATIONS: Record<string, LocationMetadata> = {
  'symphony': {
    slug: 'symphony',
    displayName: 'Symphony',
    logo: '/locations/symphony-logo.png',
    abbreviation: 'Sym',
  },
  'atlassian': {
    slug: 'atlassian',
    displayName: 'Atlassian',
    logo: '/locations/atlassian-logo.png',
    abbreviation: 'Atlas',
  },
  'snowflake': {
    slug: 'snowflake',
    displayName: 'Snowflake',
    logo: '/locations/snowflake-logo-v2.png',
    abbreviation: 'Snow',
  },
  'snapchat': {
    slug: 'snapchat',
    displayName: 'SnapChat 119',
    logo: '/locations/snapchat-logo.jpg',
    subtitle: 'Building 119',
    abbreviation: 'Snap119',
  },
  'snapchat-119': {
    slug: 'snapchat-119',
    displayName: 'SnapChat 119',
    logo: '/locations/snapchat-logo.jpg',
    subtitle: 'Building 119',
    abbreviation: 'Snap119',
  },
  'snapchat-165': {
    slug: 'snapchat-165',
    displayName: 'SnapChat 165',
    logo: '/locations/snapchat-logo.jpg',
    subtitle: 'Building 165',
    abbreviation: 'Snap165',
  },
  'jaa': {
    slug: 'jaa',
    displayName: 'JAA Training',
    logo: '/locations/jaa-logo.png',
    abbreviation: 'JAA',
  },
};

/**
 * Get location metadata by slug
 */
export function getLocationBySlug(slug: string): LocationMetadata | undefined {
  return LOCATIONS[slug];
}

/**
 * Get display name for a location slug
 */
export function getLocationDisplayName(slug: string): string {
  return LOCATIONS[slug]?.displayName || slug;
}

/**
 * Get location abbreviation for UI
 */
export function getLocationAbbreviation(slug: string): string {
  return LOCATIONS[slug]?.abbreviation || slug.slice(0, 4);
}

/**
 * Get location logo URL
 */
export function getLocationLogo(slug: string): string {
  return LOCATIONS[slug]?.logo || '/default-logo.png';
}

/**
 * Get Snapchat building number from slug
 */
export function getSnapchatBuilding(slug: string): string {
  if (slug === 'snapchat-165') return '165';
  return '119'; // Default to 119 for 'snapchat' or 'snapchat-119'
}

/**
 * Check if location is a Snapchat variant
 */
export function isSnapchatLocation(slug: string): boolean {
  return slug.startsWith('snapchat');
}

/**
 * Get all location slugs
 */
export function getAllLocationSlugs(): string[] {
  return Object.keys(LOCATIONS);
}

/**
 * Legacy mapping for backward compatibility
 * Maps URL slugs to database location names
 *
 * @deprecated Use getLocationDisplayName() instead
 */
export const LOCATION_PARAM_MAPPING: Record<string, string> = {
  'symphony': 'Symphony',
  'atlassian': 'Atlassian',
  'snowflake': 'Snowflake',
  'snapchat': 'SnapChat 119',
  'snapchat-119': 'SnapChat 119',
  'snapchat-165': 'SnapChat 165',
  'jaa': 'JAA Training',
};
