// Responsive typography and spacing utilities

/**
 * Get responsive font size based on viewport
 * @param {object} sizes - Object with breakpoint sizes
 * @returns {string} CSS font-size value
 */
export const getResponsiveFontSize = (sizes = {}) => {
  const {
    mobile = '14px',
    tablet = '16px',
    laptop = '18px',
    desktop = '20px'
  } = sizes;

  return `
    font-size: ${mobile};
    
    @media (min-width: 768px) {
      font-size: ${tablet};
    }
    
    @media (min-width: 1024px) {
      font-size: ${laptop};
    }
    
    @media (min-width: 1440px) {
      font-size: ${desktop};
    }
  `;
};

/**
 * Get responsive spacing based on viewport
 * @param {object} sizes - Object with breakpoint sizes
 * @returns {string} CSS spacing value
 */
export const getResponsiveSpacing = (sizes = {}) => {
  const {
    mobile = '1rem',
    tablet = '1.5rem',
    laptop = '2rem',
    desktop = '2.5rem'
  } = sizes;

  return `
    padding: ${mobile};
    
    @media (min-width: 768px) {
      padding: ${tablet};
    }
    
    @media (min-width: 1024px) {
      padding: ${laptop};
    }
    
    @media (min-width: 1440px) {
      padding: ${desktop};
    }
  `;
};

/**
 * Get responsive grid columns
 * @param {object} columns - Object with breakpoint columns
 * @returns {string} CSS grid-template-columns value
 */
export const getResponsiveGrid = (columns = {}) => {
  const {
    mobile = 1,
    tablet = 2,
    laptop = 3,
    desktop = 4
  } = columns;

  return `
    grid-template-columns: repeat(${mobile}, 1fr);
    
    @media (min-width: 768px) {
      grid-template-columns: repeat(${tablet}, 1fr);
    }
    
    @media (min-width: 1024px) {
      grid-template-columns: repeat(${laptop}, 1fr);
    }
    
    @media (min-width: 1440px) {
      grid-template-columns: repeat(${desktop}, 1fr);
    }
  `;
};

/**
 * Typography scale for professional hierarchy
 */
export const typographyScale = {
  h1: {
    mobile: '1.75rem',
    tablet: '2rem',
    laptop: '2.25rem',
    desktop: '2.5rem'
  },
  h2: {
    mobile: '1.5rem',
    tablet: '1.75rem',
    laptop: '2rem',
    desktop: '2.25rem'
  },
  h3: {
    mobile: '1.25rem',
    tablet: '1.5rem',
    laptop: '1.75rem',
    desktop: '2rem'
  },
  h4: {
    mobile: '1.125rem',
    tablet: '1.25rem',
    laptop: '1.5rem',
    desktop: '1.75rem'
  },
  body: {
    mobile: '0.875rem',
    tablet: '1rem',
    laptop: '1.125rem',
    desktop: '1.25rem'
  },
  small: {
    mobile: '0.75rem',
    tablet: '0.875rem',
    laptop: '1rem',
    desktop: '1.125rem'
  },
  caption: {
    mobile: '0.625rem',
    tablet: '0.75rem',
    laptop: '0.875rem',
    desktop: '1rem'
  }
};

/**
 * Get typography scale value for a specific element and breakpoint
 * @param {string} element - Element name (h1, h2, h3, h4, body, small, caption)
 * @param {string} breakpoint - Breakpoint name (mobile, tablet, laptop, desktop)
 * @returns {string} Font size value
 */
export const getTypographyScale = (element, breakpoint = 'mobile') => {
  return typographyScale[element]?.[breakpoint] || typographyScale.body[breakpoint];
};

/**
 * Generate responsive typography CSS
 * @param {string} element - Element name
 * @returns {string} CSS with responsive font sizes
 */
export const getResponsiveTypography = (element) => {
  const sizes = typographyScale[element] || typographyScale.body;
  return `
    font-size: ${sizes.mobile};
    
    @media (min-width: 768px) {
      font-size: ${sizes.tablet};
    }
    
    @media (min-width: 1024px) {
      font-size: ${sizes.laptop};
    }
    
    @media (min-width: 1440px) {
      font-size: ${sizes.desktop};
    }
  `;
};

export default {
  getResponsiveFontSize,
  getResponsiveSpacing,
  getResponsiveGrid,
  typographyScale,
  getTypographyScale,
  getResponsiveTypography
};
